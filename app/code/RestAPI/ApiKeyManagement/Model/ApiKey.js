import crypto from 'crypto';

const isExpired = (expires_at) => {
    const now = new Date();
    return new Date(expires_at) < now;
};

export class ApiKeys {
    constructor(dbConn) {
        this.dbConn = dbConn;
        this.data = null;
    }
    
    async init() {
        console.log('Initializing Data ...');
        console.log('------------------------------------------------------------------');
        console.log();
        try {
            if (!this.dbConn || this.dbConn?.status !== true) {
                throw new Error('Failed to connect to database or database module is disable');
            }
            const temp = {};
            const result = await this.dbConn.fetch(`
                SELECT * FROM api_keys;
                `);

            if (!result || !result?.data || !Array.isArray(result?.data)) {
                throw new Error('Failed to fetch api keys. Query or SQL issue');
            }
            
            for (const key of result.data) {
                if (isExpired(key?.expires_at) && key?.is_active === true) {
                    key.is_active = false;
                    // ✅ FIXED: Use parameterized query
                    await this.dbConn.fetch(`
                        UPDATE api_keys SET is_active = $1 WHERE id = $2;
                        `, [key.is_active, key.id]);
                }
                temp[key.id] = { ...key };
            }

            this.data = { ...temp };
            console.log('Successfully initialized data!');
            console.log();
            console.log('------------------------------------------------------------------');
        } catch (error) {
            console.error('Failed to Initialize data. Error(s): ', error);
        }
    }
    
    async getApiById(id) {
        console.log('Fetching Api by Id  ...');
        console.log('------------------------------------------------------------------');
        console.log(' - ID: ', id);
        console.log();
        try {
            if (!(id in this.data) || !this.data) {
                throw new Error(`ID not found in Api Keys or Api Key data not initialized`);
            }
            console.log('Successfully fetched Api!')
            console.log();
            console.log('------------------------------------------------------------------');
            return { data: this.data[id], error: '' };
        } catch (error) {
            console.error(`Failed to fetch Api ID "${id}. Error(s): ${error}"`);
            console.log();
            console.log('------------------------------------------------------------------');
            return { data: null, error: error }
        }
    }
    
    async getApiByKey(key) {
        console.log('Fetching Api by Key  ...');
        console.log('------------------------------------------------------------------');
        console.log(' - Key: ', key);
        console.log();
        try {
            if (!this.data) {
                throw new Error('API key data not initialized');
            }
            let retVal = null;
            for (const id in this.data) {
                if (key === this.data[id]?.key) {
                    retVal = this.data[id];
                    break;
                }
            }
            if (!retVal) {
                throw new Error(`Key "${key}" not found in Api Keys`);
            }
            console.log('Successfully fetched Api!')
            console.log();
            console.log('------------------------------------------------------------------');
            return { data: retVal, error: '' };

        } catch (error) {
            console.error(`Failed to fetch Api Key ${key}. Error(s): ${error}`);
            console.log();
            console.log('------------------------------------------------------------------');
            return { data: null, error: error };
        }
    }
    
    getAllKeys() {
        console.log('Fetching all Api Keys  ...');
        console.log('------------------------------------------------------------------');
        console.log();
        try {
            if (!this.data) {
                throw new Error('API key data not initialized');
            }
            console.log('Successfully fetched Api!')
            console.log();
            console.log('------------------------------------------------------------------');
            return { data: this.data, error: '' }

        } catch (error) {
            console.error(`Failed to fetch all Api Keys. Error(s): ${error}`);
            console.log();
            console.log('------------------------------------------------------------------');
            return { data: null, error: error };
        }
    }
    
    async refresh() {
        console.log('Refreshing data ...');
        console.log('------------------------------------------------------------------');
        console.log();
        try {
            this.data = null;
            await this.init();
            console.log('Successfully refreshed data!')
            console.log();
            console.log('------------------------------------------------------------------');
        } catch (error) {
            console.error(`Failed to refresh API Keys data. Error(s): ${error}`);
            console.log();
            console.log('------------------------------------------------------------------');
        }
    }
    
    async GenerateApiKey(data) {
        console.log('Generating new API Key ...');
        console.log('------------------------------------------------------------------');
        console.log('- Post body: ', data);
        try {
            const currentApiKeys = this.getAllKeys();
            const keysAsArray = [];
            for (const id in currentApiKeys?.data) {
                keysAsArray.push(currentApiKeys?.data[id]?.key);
            }
            let tempKey = crypto.randomBytes(32).toString('hex');
            while (keysAsArray.includes(tempKey)) {
                tempKey = crypto.randomBytes(32).toString('hex');
            }
            console.log(`- Generated API key: "${tempKey}"`);
            console.log('- Attempting to save API key');
            
            // ✅ FIXED: Use parameterized query for security and pool compatibility
            const result = await this.dbConn.fetch(`
                INSERT INTO api_keys(label, key, created_at, expires_at, is_active, access)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
            `, [
                data?.label,
                tempKey,
                new Date().toISOString().split('T')[0],
                data?.expires_at,
                data?.is_active,
                data?.access
            ]);
            
            // ✅ FIXED: Check result.data instead of result.rows
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('SQL command failed.');
            }
            console.log('Successfully saved the API key');
            console.log();
            console.log('------------------------------------------------------------------');
            return true;
        } catch (error) {
            console.error(`Failed to generate new API key. Error(s): ${error}`);
            console.log();
            console.log('------------------------------------------------------------------');
            return false;
        }
    }
    
    async toggleActive(id) {
        console.log('Updating Api status ...');
        console.log('------------------------------------------------------------------');
        console.log();
        console.log('- ID: ', id);
        console.log();
        try {
            const data = await this.getApiById(id);
            if (!data?.data) {
                throw new Error('Failed to fetch api by id');
            }
            if (!this.dbConn || this.dbConn.status !== true) {
                throw new Error('DB connection is not established or module is disabled');
            }
            let inputData = data?.data?.is_active === true ? false : true;

            // ✅ FIXED: Use parameterized query
            await this.dbConn.fetch(`
                UPDATE api_keys SET is_active = $1 WHERE id = $2;
            `, [inputData, id]);
            
            console.log('Successfully updated API key status');
            console.log();
            console.log('------------------------------------------------------------------');
            return true;

        } catch (error) {
            console.error(`Failed to update api to active. Error(s): ${error}`);
            console.log();
            console.log('------------------------------------------------------------------');
            return false;
        }
    }
    
    async deleteApi(id) {
        console.log('Removing API key ...');
        console.log('------------------------------------------------------------------');
        console.log();
        console.log('- ID: ', id);
        console.log();
        try {
            const data = await this.getApiById(id);
            console.log('DATA FOUND FOR API IN DELETE -> ', data);
            if (!data?.data) {
                throw new Error('Failed to fetch api by id');
            }
            
            // ✅ FIXED: Use parameterized query
            const result = await this.dbConn.fetch(`
                DELETE FROM api_keys WHERE id = $1;
            `, [id]);
            
            console.log('Successfully removed API key');
            console.log();
            console.log('------------------------------------------------------------------');
            return true;
        } catch (error) {
            console.error(`Failed to delete api. Error(s): ${error}`);
            console.log();
            console.log('------------------------------------------------------------------');
            return false;
        }
    }
}
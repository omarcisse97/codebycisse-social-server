export class Hashtag {
    constructor(
        dbConn,
        id = null,
        name = null,
        usage_count = 0,
        created_at = null
    ) {
        this._id = id;
        this._name = name;
        this._usage_count = usage_count;
        this._created_at = created_at;
        this._dbConn = dbConn;
    }

    async init(id = null) {
        try {
            let currentId = id ? id : this._id;
            if (!currentId) {
                throw new Error('Primary Key is not initialized.');
            }
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            const result = await this._dbConn.fetch(`
                SELECT * FROM hashtags WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            this._id = currentId;
            this._name = result?.data?.[0]?.name;
            this._usage_count = result?.data?.[0]?.usage_count;
            this._created_at = result?.data?.[0]?.created_at;

        } catch (error) {
            console.error('Failed to initialize Hashtag model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (
                !this._id ||
                !this._name ||
                this._usage_count === null || this._usage_count === undefined
            ) throw new Error('Data is not initialized');
            return {
                id: this._id,
                name: this._name,
                usage_count: this._usage_count,
                created_at: this._created_at
            }

        } catch (error) {
            console.error('Failed to get data. Error(s): ', error);
            return null;
        }
    }

    async create(data) {
        try {
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            for (const key in data) {
                if (key !== 'name' && key !== 'usage_count') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO hashtags(name, usage_count) VALUES($1, $2) RETURNING *;
                `, [data?.name, data?.usage_count]);
            if (!result || !result?.rows?.[0]) {
                throw new Error('Failed to get created data');
            }
            return result?.rows?.[0];
        } catch (error) {
            console.error('Failed to create new record. Error(s): ', error);
            return null;
        }
    }

    async update(data) {
        try {
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            if (!this._id) {
                throw new Error('Missing or invalid primary key identified');
            }
            const colsArr = [];
            const dataArr = [];
            for (const key in data) {
                if (key !== 'usage_count') {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE hashtags SET ';
            for (let i = 0; i < colsArr.length; i++) {
                query = `${query} ${colsArr[i]} = $${i + 1}`
                if (i < colsArr.length - 1) {
                    query = `${query},`;
                }
            }
            query = `${query} WHERE id = $${colsArr.length + 1} RETURNING *;`;

            const result = await this._dbConn.client.query(
                query,
                [...dataArr, this._id]
            );
            if (!result?.rows?.[0]) {
                throw new Error('Failed to obtain updated record');
            }
            return result?.rows?.[0];
        } catch (error) {
            console.error('Failed to update record. Error(s): ', error);
            return null;
        }
    }

    async delete() {
        try {
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            if (!this._id) {
                throw new Error('Missing or invalid primary key identified');
            }
            const result = await this._dbConn.client.query(`DELETE FROM hashtags WHERE id = $1 RETURNING *`, [this._id]);
            if (!result?.rows || !result?.rows?.[0]) {
                throw new Error('Record not found for deletion');
            }
            return true;
        } catch (error) {
            console.error('Failed to delete record');
            return false;
        }
    }
}

export class HashtagList {
    constructor(dbConn) {
        this.data = null;
        this.dbConn = dbConn;
    }

    async init() {
        try {
            this.data = [];
            if (!this.dbConn || this.dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }

            const result = await this.dbConn.fetch('SELECT * FROM hashtags ORDER BY usage_count DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new Hashtag(this.dbConn, row?.id, row?.name, row?.usage_count, row?.created_at)
                );
            });

        } catch (error) {
            console.error('HashtagList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const hashtag of this.data) {
                retVal.push(await hashtag?.getData());
            }
            return retVal;

        } catch (error) {
            console.error('Failed to fetch all data. Error(s): ', error);
            return null;
        }
    }

    async getDataByID(id) {
        try {
            if (!this.data || !Array.isArray(this.data)) {
                throw new Error('Data not initialized');
            }
            let retVal = null;
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i]._id === id) {
                    retVal = this.data[i];
                    break;
                }
            }
            if (!retVal) {
                throw new Error(`No data found for id "${id}"`);
            }
            return retVal;
        } catch (error) {
            console.error('Failed to fetch data. Error(s): ', error);
            return null;
        }
    }
}
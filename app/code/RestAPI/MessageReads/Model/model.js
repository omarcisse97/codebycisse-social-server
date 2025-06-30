export class MessageRead {
    constructor(
        dbConn,
        id = null,
        message_id = null,
        user_id = null,
        read_at = null
    ) {
        this._id = id;
        this._message_id = message_id;
        this._user_id = user_id;
        this._read_at = read_at;
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
                SELECT * FROM message_reads WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            this._id = currentId;
            this._message_id = result?.data?.[0]?.message_id;
            this._user_id = result?.data?.[0]?.user_id;
            this._read_at = result?.data?.[0]?.read_at;

        } catch (error) {
            console.error('Failed to initialize MessageRead model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (
                !this._id ||
                !this._message_id ||
                !this._user_id
            ) throw new Error('Data is not initialized');
            return {
                id: this._id,
                message_id: this._message_id,
                user_id: this._user_id,
                read_at: this._read_at
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
                if (key !== 'message_id' && key !== 'user_id') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO message_reads(message_id, user_id) VALUES($1, $2) RETURNING *;
                `, [data?.message_id, data?.user_id]);
            if (!result || !result?.rows?.[0]) {
                throw new Error('Failed to get created data');
            }
            return result?.rows?.[0];
        } catch (error) {
            console.error('Failed to create new record. Error(s): ', error);
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
            const result = await this._dbConn.client.query(`DELETE FROM message_reads WHERE id = $1 RETURNING *`, [this._id]);
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

export class MessageReadList {
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

            const result = await this.dbConn.fetch('SELECT * FROM message_reads ORDER BY read_at DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new MessageRead(this.dbConn, row?.id, row?.message_id, row?.user_id, row?.read_at)
                );
            });

        } catch (error) {
            console.error('MessageReadList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const messageRead of this.data) {
                retVal.push(await messageRead?.getData());
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
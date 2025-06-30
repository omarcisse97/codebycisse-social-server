export class ConversationParticipant {
    constructor(
        dbConn,
        id = null,
        conversation_id = null,
        user_id = null,
        joined_at = null,
        left_at = null,
        is_admin = false
    ) {
        this._id = id;
        this._conversation_id = conversation_id;
        this._user_id = user_id;
        this._joined_at = joined_at;
        this._left_at = left_at;
        this._is_admin = is_admin;
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
                SELECT * FROM conversation_participants WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            this._id = currentId;
            this._conversation_id = result?.data?.[0]?.conversation_id;
            this._user_id = result?.data?.[0]?.user_id;
            this._joined_at = result?.data?.[0]?.joined_at;
            this._left_at = result?.data?.[0]?.left_at;
            this._is_admin = result?.data?.[0]?.is_admin;

        } catch (error) {
            console.error('Failed to initialize ConversationParticipant model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (
                !this._id ||
                !this._conversation_id ||
                !this._user_id
            ) throw new Error('Data is not initialized');
            return {
                id: this._id,
                conversation_id: this._conversation_id,
                user_id: this._user_id,
                joined_at: this._joined_at,
                left_at: this._left_at,
                is_admin: this._is_admin
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
                if (key !== 'conversation_id' && key !== 'user_id' && key !== 'is_admin') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO conversation_participants(conversation_id, user_id, is_admin) VALUES($1, $2, $3) RETURNING *;
                `, [data?.conversation_id, data?.user_id, data?.is_admin]);
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
                if (key !== 'left_at' && key !== 'is_admin') {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE conversation_participants SET ';
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
            const result = await this._dbConn.client.query(`DELETE FROM conversation_participants WHERE id = $1 RETURNING *`, [this._id]);
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

export class ConversationParticipantList {
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

            const result = await this.dbConn.fetch('SELECT * FROM conversation_participants');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new ConversationParticipant(this.dbConn, row?.id, row?.conversation_id, row?.user_id, row?.joined_at, row?.left_at, row?.is_admin)
                );
            });

        } catch (error) {
            console.error('ConversationParticipantList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const participant of this.data) {
                retVal.push(await participant?.getData());
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
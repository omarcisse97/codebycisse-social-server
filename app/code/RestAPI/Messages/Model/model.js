export class Message {
    constructor(
        dbConn,
        id = null,
        conversation_id = null,
        sender_id = null,
        content = null,
        media_urls = null,
        media_type = null,
        reply_to_message_id = null,
        is_edited = false,
        is_deleted = false,
        created_at = null,
        updated_at = null
    ) {
        this._id = id;
        this._conversation_id = conversation_id;
        this._sender_id = sender_id;
        this._content = content;
        this._media_urls = media_urls;
        this._media_type = media_type;
        this._reply_to_message_id = reply_to_message_id;
        this._is_edited = is_edited;
        this._is_deleted = is_deleted;
        this._created_at = created_at;
        this._updated_at = updated_at;
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
                SELECT * FROM messages WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            const messageData = result.data[0];
            this._id = currentId;
            Object.assign(this, {
                _conversation_id: messageData.conversation_id,
                _sender_id: messageData.sender_id,
                _content: messageData.content,
                _media_urls: messageData.media_urls,
                _media_type: messageData.media_type,
                _reply_to_message_id: messageData.reply_to_message_id,
                _is_edited: messageData.is_edited,
                _is_deleted: messageData.is_deleted,
                _created_at: messageData.created_at,
                _updated_at: messageData.updated_at
            });
        } catch (error) {
            console.error('Failed to initialize Message model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (!this._id || !this._conversation_id || !this._sender_id) {
                throw new Error('Data is not initialized');
            }
            return {
                id: this._id,
                conversation_id: this._conversation_id,
                sender_id: this._sender_id,
                content: this._content,
                media_urls: this._media_urls,
                media_type: this._media_type,
                reply_to_message_id: this._reply_to_message_id,
                is_edited: this._is_edited,
                is_deleted: this._is_deleted,
                created_at: this._created_at,
                updated_at: this._updated_at
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
            const validFields = ['conversation_id', 'sender_id', 'content', 'media_urls', 'media_type', 'reply_to_message_id'];
            for (const key in data) {
                if (!validFields.includes(key)) {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO messages(conversation_id, sender_id, content, media_urls, media_type, reply_to_message_id) 
                VALUES($1, $2, $3, $4, $5, $6) RETURNING *;
                `, [data?.conversation_id, data?.sender_id, data?.content, data?.media_urls, data?.media_type, data?.reply_to_message_id]);
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
            const validFields = ['content', 'media_urls', 'media_type', 'is_edited', 'is_deleted'];
            const colsArr = [];
            const dataArr = [];
            for (const key in data) {
                if (!validFields.includes(key)) {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE messages SET ';
            for (let i = 0; i < colsArr.length; i++) {
                query = `${query} ${colsArr[i]} = ${i + 1}`
                if (i < colsArr.length - 1) {
                    query = `${query},`;
                }
            }
            query = `${query} WHERE id = ${colsArr.length + 1} RETURNING *;`;

            const result = await this._dbConn.client.query(query, [...dataArr, this._id]);
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
            const result = await this._dbConn.client.query(`DELETE FROM messages WHERE id = $1 RETURNING *`, [this._id]);
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

export class MessageList {
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
            const result = await this.dbConn.fetch('SELECT * FROM messages ORDER BY created_at DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(new Message(this.dbConn, row?.id, row?.conversation_id, row?.sender_id, row?.content, row?.media_urls, row?.media_type, row?.reply_to_message_id, row?.is_edited, row?.is_deleted, row?.created_at, row?.updated_at));
            });
        } catch (error) {
            console.error('MessageList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const message of this.data) {
                retVal.push(await message?.getData());
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
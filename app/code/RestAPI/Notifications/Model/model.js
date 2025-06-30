export class Notification {
    constructor(
        dbConn,
        id = null,
        user_id = null,
        type = null,
        title = null,
        content = null,
        data = null,
        related_user_id = null,
        related_post_id = null,
        related_comment_id = null,
        is_read = false,
        created_at = null
    ) {
        this._id = id;
        this._user_id = user_id;
        this._type = type;
        this._title = title;
        this._content = content;
        this._data = data;
        this._related_user_id = related_user_id;
        this._related_post_id = related_post_id;
        this._related_comment_id = related_comment_id;
        this._is_read = is_read;
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
                SELECT * FROM notifications WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            const notificationData = result.data[0];
            this._id = currentId;
            Object.assign(this, {
                _user_id: notificationData.user_id,
                _type: notificationData.type,
                _title: notificationData.title,
                _content: notificationData.content,
                _data: notificationData.data,
                _related_user_id: notificationData.related_user_id,
                _related_post_id: notificationData.related_post_id,
                _related_comment_id: notificationData.related_comment_id,
                _is_read: notificationData.is_read,
                _created_at: notificationData.created_at
            });
        } catch (error) {
            console.error('Failed to initialize Notification model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (!this._id || !this._user_id || !this._type || !this._title) {
                throw new Error('Data is not initialized');
            }
            return {
                id: this._id,
                user_id: this._user_id,
                type: this._type,
                title: this._title,
                content: this._content,
                data: this._data,
                related_user_id: this._related_user_id,
                related_post_id: this._related_post_id,
                related_comment_id: this._related_comment_id,
                is_read: this._is_read,
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
            const validFields = ['user_id', 'type', 'title', 'content', 'data', 'related_user_id', 'related_post_id', 'related_comment_id'];
            for (const key in data) {
                if (!validFields.includes(key)) {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO notifications(user_id, type, title, content, data, related_user_id, related_post_id, related_comment_id) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
                `, [data?.user_id, data?.type, data?.title, data?.content, data?.data, data?.related_user_id, data?.related_post_id, data?.related_comment_id]);
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
            const validFields = ['title', 'content', 'data', 'is_read'];
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
            let query = 'UPDATE notifications SET ';
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
            const result = await this._dbConn.client.query(`DELETE FROM notifications WHERE id = $1 RETURNING *`, [this._id]);
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

export class NotificationList {
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
            const result = await this.dbConn.fetch('SELECT * FROM notifications ORDER BY created_at DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(new Notification(this.dbConn, row?.id, row?.user_id, row?.type, row?.title, row?.content, row?.data, row?.related_user_id, row?.related_post_id, row?.related_comment_id, row?.is_read, row?.created_at));
            });
        } catch (error) {
            console.error('NotificationList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const notification of this.data) {
                retVal.push(await notification?.getData());
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

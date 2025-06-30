export class Comment {
    constructor(
        dbConn,
        id = null,
        post_id = null,
        user_id = null,
        parent_comment_id = null,
        content = null,
        media_url = null,
        likes_count = 0,
        replies_count = 0,
        is_pinned = false,
        created_at = null,
        updated_at = null
    ) {
        this._id = id;
        this._post_id = post_id;
        this._user_id = user_id;
        this._parent_comment_id = parent_comment_id;
        this._content = content;
        this._media_url = media_url;
        this._likes_count = likes_count;
        this._replies_count = replies_count;
        this._is_pinned = is_pinned;
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
                SELECT * FROM comments WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            const commentData = result.data[0];
            this._id = currentId;
            Object.assign(this, {
                _post_id: commentData.post_id,
                _user_id: commentData.user_id,
                _parent_comment_id: commentData.parent_comment_id,
                _content: commentData.content,
                _media_url: commentData.media_url,
                _likes_count: commentData.likes_count,
                _replies_count: commentData.replies_count,
                _is_pinned: commentData.is_pinned,
                _created_at: commentData.created_at,
                _updated_at: commentData.updated_at
            });
        } catch (error) {
            console.error('Failed to initialize Comment model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (!this._id || !this._post_id || !this._user_id || !this._content) {
                throw new Error('Data is not initialized');
            }
            return {
                id: this._id,
                post_id: this._post_id,
                user_id: this._user_id,
                parent_comment_id: this._parent_comment_id,
                content: this._content,
                media_url: this._media_url,
                likes_count: this._likes_count,
                replies_count: this._replies_count,
                is_pinned: this._is_pinned,
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
            const validFields = ['post_id', 'user_id', 'parent_comment_id', 'content', 'media_url', 'is_pinned'];
            for (const key in data) {
                if (!validFields.includes(key)) {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO comments(post_id, user_id, parent_comment_id, content, media_url, is_pinned) 
                VALUES($1, $2, $3, $4, $5, $6) RETURNING *;
                `, [data?.post_id, data?.user_id, data?.parent_comment_id, data?.content, data?.media_url, data?.is_pinned]);
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
            const validFields = ['content', 'media_url', 'is_pinned'];
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
            let query = 'UPDATE comments SET ';
            for (let i = 0; i < colsArr.length; i++) {
                query = `${query} ${colsArr[i]} = $${i + 1}`
                if (i < colsArr.length - 1) {
                    query = `${query},`;
                }
            }
            query = `${query} WHERE id = $${colsArr.length + 1} RETURNING *;`;

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
            const result = await this._dbConn.client.query(`DELETE FROM comments WHERE id = $1 RETURNING *`, [this._id]);
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

export class CommentList {
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
            const result = await this.dbConn.fetch('SELECT * FROM comments ORDER BY created_at DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(new Comment(this.dbConn, row?.id, row?.post_id, row?.user_id, row?.parent_comment_id, row?.content, row?.media_url, row?.likes_count, row?.replies_count, row?.is_pinned, row?.created_at, row?.updated_at));
            });
        } catch (error) {
            console.error('CommentList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const comment of this.data) {
                retVal.push(await comment?.getData());
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

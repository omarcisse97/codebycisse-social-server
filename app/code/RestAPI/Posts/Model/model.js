export class Post {
    constructor(
        dbConn,
        id = null,
        user_id = null,
        content = null,
        media_urls = null,
        media_type = null,
        is_pinned = false,
        is_archived = false,
        location = null,
        tags = null,
        mentions = null,
        visibility = 'public',
        comments_enabled = true,
        likes_count = 0,
        comments_count = 0,
        shares_count = 0,
        views_count = 0,
        created_at = null,
        updated_at = null
    ) {
        this._id = id;
        this._user_id = user_id;
        this._content = content;
        this._media_urls = media_urls;
        this._media_type = media_type;
        this._is_pinned = is_pinned;
        this._is_archived = is_archived;
        this._location = location;
        this._tags = tags;
        this._mentions = mentions;
        this._visibility = visibility;
        this._comments_enabled = comments_enabled;
        this._likes_count = likes_count;
        this._comments_count = comments_count;
        this._shares_count = shares_count;
        this._views_count = views_count;
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
                SELECT * FROM posts WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            const postData = result.data[0];
            this._id = currentId;
            Object.assign(this, {
                _user_id: postData.user_id,
                _content: postData.content,
                _media_urls: postData.media_urls,
                _media_type: postData.media_type,
                _is_pinned: postData.is_pinned,
                _is_archived: postData.is_archived,
                _location: postData.location,
                _tags: postData.tags,
                _mentions: postData.mentions,
                _visibility: postData.visibility,
                _comments_enabled: postData.comments_enabled,
                _likes_count: postData.likes_count,
                _comments_count: postData.comments_count,
                _shares_count: postData.shares_count,
                _views_count: postData.views_count,
                _created_at: postData.created_at,
                _updated_at: postData.updated_at
            });
        } catch (error) {
            console.error('Failed to initialize Post model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (!this._id || !this._user_id || !this._content) {
                throw new Error('Data is not initialized');
            }
            return {
                id: this._id,
                user_id: this._user_id,
                content: this._content,
                media_urls: this._media_urls,
                media_type: this._media_type,
                is_pinned: this._is_pinned,
                is_archived: this._is_archived,
                location: this._location,
                tags: this._tags,
                mentions: this._mentions,
                visibility: this._visibility,
                comments_enabled: this._comments_enabled,
                likes_count: this._likes_count,
                comments_count: this._comments_count,
                shares_count: this._shares_count,
                views_count: this._views_count,
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
            const validFields = ['user_id', 'content', 'media_urls', 'media_type', 'is_pinned', 'is_archived', 'location', 'tags', 'mentions', 'visibility', 'comments_enabled'];
            for (const key in data) {
                if (!validFields.includes(key)) {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO posts(user_id, content, media_urls, media_type, is_pinned, is_archived, location, tags, mentions, visibility, comments_enabled) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
                `, [data?.user_id, data?.content, data?.media_urls, data?.media_type, data?.is_pinned, data?.is_archived, data?.location, data?.tags, data?.mentions, data?.visibility, data?.comments_enabled]);
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
            const validFields = ['content', 'media_urls', 'media_type', 'is_pinned', 'is_archived', 'location', 'tags', 'mentions', 'visibility', 'comments_enabled'];
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
            let query = 'UPDATE posts SET ';
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
            const result = await this._dbConn.client.query(`DELETE FROM posts WHERE id = $1 RETURNING *`, [this._id]);
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

export class PostList {
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
            const result = await this.dbConn.fetch('SELECT * FROM posts ORDER BY created_at DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(new Post(this.dbConn, row?.id, row?.user_id, row?.content, row?.media_urls, row?.media_type, row?.is_pinned, row?.is_archived, row?.location, row?.tags, row?.mentions, row?.visibility, row?.comments_enabled, row?.likes_count, row?.comments_count, row?.shares_count, row?.views_count, row?.created_at, row?.updated_at));
            });
        } catch (error) {
            console.error('PostList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const post of this.data) {
                retVal.push(await post?.getData());
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

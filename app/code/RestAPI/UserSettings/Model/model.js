export class UserSettings {
    constructor(
        dbConn,
        id = null,
        user_id = null,
        profile_visibility = 'public',
        show_online_status = true,
        show_last_seen = true,
        email_notifications = true,
        push_notifications = true,
        sms_notifications = false,
        notification_likes = true,
        notification_comments = true,
        notification_follows = true,
        notification_mentions = true,
        notification_messages = true,
        auto_play_videos = true,
        show_sensitive_content = false,
        created_at = null,
        updated_at = null
    ) {
        this._id = id;
        this._user_id = user_id;
        this._profile_visibility = profile_visibility;
        this._show_online_status = show_online_status;
        this._show_last_seen = show_last_seen;
        this._email_notifications = email_notifications;
        this._push_notifications = push_notifications;
        this._sms_notifications = sms_notifications;
        this._notification_likes = notification_likes;
        this._notification_comments = notification_comments;
        this._notification_follows = notification_follows;
        this._notification_mentions = notification_mentions;
        this._notification_messages = notification_messages;
        this._auto_play_videos = auto_play_videos;
        this._show_sensitive_content = show_sensitive_content;
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
                SELECT * FROM user_settings WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            this._id = currentId;
            this._user_id = result?.data?.[0]?.user_id;
            this._profile_visibility = result?.data?.[0]?.profile_visibility;
            this._show_online_status = result?.data?.[0]?.show_online_status;
            this._show_last_seen = result?.data?.[0]?.show_last_seen;
            this._email_notifications = result?.data?.[0]?.email_notifications;
            this._push_notifications = result?.data?.[0]?.push_notifications;
            this._sms_notifications = result?.data?.[0]?.sms_notifications;
            this._notification_likes = result?.data?.[0]?.notification_likes;
            this._notification_comments = result?.data?.[0]?.notification_comments;
            this._notification_follows = result?.data?.[0]?.notification_follows;
            this._notification_mentions = result?.data?.[0]?.notification_mentions;
            this._notification_messages = result?.data?.[0]?.notification_messages;
            this._auto_play_videos = result?.data?.[0]?.auto_play_videos;
            this._show_sensitive_content = result?.data?.[0]?.show_sensitive_content;
            this._created_at = result?.data?.[0]?.created_at;
            this._updated_at = result?.data?.[0]?.updated_at;

        } catch (error) {
            console.error('Failed to initialize UserSettings model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (
                !this._id ||
                !this._user_id
            ) throw new Error('Data is not initialized');
            return {
                id: this._id,
                user_id: this._user_id,
                profile_visibility: this._profile_visibility,
                show_online_status: this._show_online_status,
                show_last_seen: this._show_last_seen,
                email_notifications: this._email_notifications,
                push_notifications: this._push_notifications,
                sms_notifications: this._sms_notifications,
                notification_likes: this._notification_likes,
                notification_comments: this._notification_comments,
                notification_follows: this._notification_follows,
                notification_mentions: this._notification_mentions,
                notification_messages: this._notification_messages,
                auto_play_videos: this._auto_play_videos,
                show_sensitive_content: this._show_sensitive_content,
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
            for (const key in data) {
                if (key !== 'user_id' && key !== 'profile_visibility' && key !== 'show_online_status' && key !== 'show_last_seen' && key !== 'email_notifications' && key !== 'push_notifications' && key !== 'sms_notifications' && key !== 'notification_likes' && key !== 'notification_comments' && key !== 'notification_follows' && key !== 'notification_mentions' && key !== 'notification_messages' && key !== 'auto_play_videos' && key !== 'show_sensitive_content') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO user_settings(user_id, profile_visibility, show_online_status, show_last_seen, email_notifications, push_notifications, sms_notifications, notification_likes, notification_comments, notification_follows, notification_mentions, notification_messages, auto_play_videos, show_sensitive_content) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;
                `, [data?.user_id, data?.profile_visibility, data?.show_online_status, data?.show_last_seen, data?.email_notifications, data?.push_notifications, data?.sms_notifications, data?.notification_likes, data?.notification_comments, data?.notification_follows, data?.notification_mentions, data?.notification_messages, data?.auto_play_videos, data?.show_sensitive_content]);
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
                if (key !== 'profile_visibility' && key !== 'show_online_status' && key !== 'show_last_seen' && key !== 'email_notifications' && key !== 'push_notifications' && key !== 'sms_notifications' && key !== 'notification_likes' && key !== 'notification_comments' && key !== 'notification_follows' && key !== 'notification_mentions' && key !== 'notification_messages' && key !== 'auto_play_videos' && key !== 'show_sensitive_content') {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE user_settings SET ';
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
            const result = await this._dbConn.client.query(`DELETE FROM user_settings WHERE id = $1 RETURNING *`, [this._id]);
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

export class UserSettingsList {
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

            const result = await this.dbConn.fetch('SELECT * FROM user_settings');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new UserSettings(this.dbConn, row?.id, row?.user_id, row?.profile_visibility, row?.show_online_status, row?.show_last_seen, row?.email_notifications, row?.push_notifications, row?.sms_notifications, row?.notification_likes, row?.notification_comments, row?.notification_follows, row?.notification_mentions, row?.notification_messages, row?.auto_play_videos, row?.show_sensitive_content, row?.created_at, row?.updated_at)
                );
            });

        } catch (error) {
            console.error('UserSettingsList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const settings of this.data) {
                retVal.push(await settings?.getData());
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
export class Avatar {
    constructor(
        dbConn,
        id = null,
        user_id = null,
        figure = null,
        gender = null,
        created_at = null,
        updated_at = null
    ) {
        this._id = id;
        this._user_id = user_id;
        this._figure = figure;
        this._gender = gender;
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
                SELECT * FROM avatars WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            this._id = currentId;
            this._user_id = result?.data?.[0]?.user_id;
            this._figure = result?.data?.[0]?.figure;
            this._gender = result?.data?.[0]?.gender;
            this._created_at = result?.data?.[0]?.created_at;
            this._updated_at = result?.data?.[0]?.updated_at;

        } catch (error) {
            console.error('Failed to initialize Avatar model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (
                !this._id ||
                !this._user_id ||
                !this._figure ||
                !this._gender
            ) throw new Error('Data is not initialized');
            return {
                id: this._id,
                user_id: this._user_id,
                figure: this._figure,
                gender: this._gender,
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
                if (key !== 'user_id' && key !== 'figure' && key !== 'gender') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO avatars(user_id, figure, gender) VALUES($1, $2, $3) RETURNING *;
                `, [data?.user_id, data?.figure, data?.gender]);
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
            if (!this._id || !this._user_id) {
                throw new Error('Missing or invalid primary key identified');
            }
            const colsArr = [];
            const dataArr = [];
            for (const key in data) {
                if (key !== 'figure' && key !== 'gender') {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE avatars SET ';
            for (let i = 0; i < colsArr.length; i++) {
                query = `${query} ${colsArr[i]} = $${i + 1}`
                if (i < colsArr.length - 1) {
                    query = `${query},`;
                }
            }
            query = `${query} WHERE user_id = $${colsArr.length + 1} RETURNING *;`;

            const result = await this._dbConn.client.query(
                query,
                [...dataArr, this._user_id]
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
            const result = await this._dbConn.client.query(`DELETE FROM avatars WHERE id = $1 RETURNING *`, [this._id]);
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

export class AvatarList {
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

            const result = await this.dbConn.fetch('SELECT * FROM avatars');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new Avatar(this.dbConn, row?.id, row?.user_id, row?.figure, row?.gender, row?.created_at, row?.updated_at)
                );
            });

        } catch (error) {
            console.error('AvatarList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const avatar of this.data) {
                retVal.push(await avatar?.getData());
            }
            return retVal;

        } catch (error) {
            console.error('Failed to fetch all data. Error(s): ', error);
            return null;
        }
    }

    async getDataByID(user_id) {
        try {
            if (!this.data || !Array.isArray(this.data)) {
                throw new Error('Data not initialized');
            }
            let retVal = null;
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i]._user_id === user_id) {
                    retVal = this.data[i];
                    break;
                }
            }
            if (!retVal) {
                throw new Error(`No data found for id "${user_id}"`);
            }
            return retVal;
        } catch (error) {
            console.error('Failed to fetch data. Error(s): ', error);
            return null;
        }
    }
}
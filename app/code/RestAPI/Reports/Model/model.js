export class Report {
    constructor(
        dbConn,
        id = null,
        reporter_id = null,
        reported_user_id = null,
        reported_post_id = null,
        reported_comment_id = null,
        reason = null,
        description = null,
        status = 'pending',
        reviewed_by = null,
        reviewed_at = null,
        created_at = null
    ) {
        this._id = id;
        this._reporter_id = reporter_id;
        this._reported_user_id = reported_user_id;
        this._reported_post_id = reported_post_id;
        this._reported_comment_id = reported_comment_id;
        this._reason = reason;
        this._description = description;
        this._status = status;
        this._reviewed_by = reviewed_by;
        this._reviewed_at = reviewed_at;
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
                SELECT * FROM reports WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            this._id = currentId;
            this._reporter_id = result?.data?.[0]?.reporter_id;
            this._reported_user_id = result?.data?.[0]?.reported_user_id;
            this._reported_post_id = result?.data?.[0]?.reported_post_id;
            this._reported_comment_id = result?.data?.[0]?.reported_comment_id;
            this._reason = result?.data?.[0]?.reason;
            this._description = result?.data?.[0]?.description;
            this._status = result?.data?.[0]?.status;
            this._reviewed_by = result?.data?.[0]?.reviewed_by;
            this._reviewed_at = result?.data?.[0]?.reviewed_at;
            this._created_at = result?.data?.[0]?.created_at;

        } catch (error) {
            console.error('Failed to initialize Report model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (
                !this._id ||
                !this._reporter_id ||
                !this._reason
            ) throw new Error('Data is not initialized');
            return {
                id: this._id,
                reporter_id: this._reporter_id,
                reported_user_id: this._reported_user_id,
                reported_post_id: this._reported_post_id,
                reported_comment_id: this._reported_comment_id,
                reason: this._reason,
                description: this._description,
                status: this._status,
                reviewed_by: this._reviewed_by,
                reviewed_at: this._reviewed_at,
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
                if (key !== 'reporter_id' && key !== 'reported_user_id' && key !== 'reported_post_id' && key !== 'reported_comment_id' && key !== 'reason' && key !== 'description' && key !== 'status') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO reports(reporter_id, reported_user_id, reported_post_id, reported_comment_id, reason, description, status) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *;
                `, [data?.reporter_id, data?.reported_user_id, data?.reported_post_id, data?.reported_comment_id, data?.reason, data?.description, data?.status]);
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
                if (key !== 'description' && key !== 'status' && key !== 'reviewed_by' && key !== 'reviewed_at') {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE reports SET ';
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
            const result = await this._dbConn.client.query(`DELETE FROM reports WHERE id = $1 RETURNING *`, [this._id]);
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

export class ReportList {
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

            const result = await this.dbConn.fetch('SELECT * FROM reports ORDER BY created_at DESC');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new Report(this.dbConn, row?.id, row?.reporter_id, row?.reported_user_id, row?.reported_post_id, row?.reported_comment_id, row?.reason, row?.description, row?.status, row?.reviewed_by, row?.reviewed_at, row?.created_at)
                );
            });

        } catch (error) {
            console.error('ReportList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const report of this.data) {
                retVal.push(await report?.getData());
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
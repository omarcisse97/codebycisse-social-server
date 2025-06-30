export class Supplier {
    constructor(
        dbConn,
        snum = null,
        sname = null,
        status = null,
        city = null
    ) {
        this._snum = snum;
        this._sname = sname;
        this._status = status;
        this._city = city;
        this._dbConn = dbConn;
    }
    async init(snum = null) {
        try {
            let currentSnum = snum ? snum : this._snum;
            if (!currentSnum) {
                throw new Error('Primary Key is not initialized.');
            }
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            const result = await this._dbConn.fetch(`
                SELECT * FROM suppliers WHERE snum = $1
                `, [currentSnum]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with snum (pk) : ', currentSnum);
            }
            this._snum = currentSnum;
            this._sname = result?.data?.[0]?.sname;
            this._status = result?.data?.[0]?.status;
            this._city = result?.data?.[0]?.city;

        } catch (error) {
            console.error('Failed to initialize Supplier model. Error(s)', error);
        }


    }
    async getData() {
        try {
            if (
                !this._snum ||
                !this._sname ||
                this._status === null || this._status === undefined ||
                !this._city
            ) throw new Error('Data is not initialized');
            return {
                snum: this._snum,
                sname: this._sname,
                status: this._status,
                city: this._city
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
                if (key !== 'sname' && key !== 'status' && key !== 'city') {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }
            const result = await this._dbConn.client.query(`
                INSERT INTO suppliers(sname, status, city) VALUES($1, $2, $3) RETURNING *;
                `, [data?.sname, data?.status, data?.city]);
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
            if (!this._snum) {
                throw new Error('Missing or invalid primary key identified');
            }
            const colsArr = [];
            const dataArr = [];
            for (const key in data) {
                if (key !== 'sname' && key !== 'status' && key !== 'city') {
                    throw new Error(`Invalid column field "${key}"`);
                }
                colsArr.push(key);
                dataArr.push(data[key]);
            }
            if (colsArr.length < 1 || dataArr.length < 1) {
                throw new Error('No valid fields or records to update');
            }
            let query = 'UPDATE suppliers SET ';
            for (let i = 0; i < colsArr.length; i++) {
                query = `${query} ${colsArr[i]} = $${i + 1}`
                if (i < colsArr.length - 1) {
                    query = `${query},`;
                }
            }
            query = `${query} WHERE snum = $${colsArr.length + 1} RETURNING *;`;

            const result = await this._dbConn.client.query(
                query,
                [...dataArr, this._snum]
            );
            if (!result?.rows?.[0]) {
                throw new Error('Failed to obtain udpated record');
            }
            return result?.rows?.[0];
        } catch (error) {
            console.error('Failed to updated record. Error(s): ', error);
            return null;
        }

    }
    async delete(){
        try{
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            if (!this._snum) {
                throw new Error('Missing or invalid primary key identified');
            }
            const result = await this._dbConn.client.query(`DELETE FROM suppliers WHERE snum = $1 RETURNING *`, [this._snum]);
            if(!result?.rows || !result?.rows?.[0]){
                throw new Error('Record not found for deletion');
            }
            return true;
        } catch(error){
            console.error('Failed to delete record');
            return false;
        }
    }
}
export class SupplierList {
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

            const result = await this.dbConn.fetch('SELECT * FROM suppliers');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occured when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new Supplier(this.dbConn, row?.snum, row?.sname, row?.status, row?.city)
                );
            });

        } catch (error) {
            console.error('SupplierList init failed. Error(s): ', error);
        }
    }
    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const supplier of this.data) {
                retVal.push(await supplier?.getData());
            }
            return retVal;

        } catch (error) {
            console.error('Failed to fetch all data. Error(s): ', error);
            return null;
        }
    }
    async getDataBySNUM(snum) {
        try {
            if (!this.data || !Array.isArray(this.data)) {
                throw new Error('Data not initialized');
            }
            let retVal = null;
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i]._snum === snum) {
                    retVal = this.data[i];
                    break;
                }
            }
            if (!retVal) {
                throw new Error(`No data found for snum "${snum}"`);
            }
            return retVal;
        } catch (error) {
            console.error('Failed to fetch data. Error(s): ', error);
            return null;
        }
    }
}
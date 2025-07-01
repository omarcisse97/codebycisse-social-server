export class User {
    constructor(
        dbConn,
        id = null,
        email = null,
        username = null,
        full_name = null,
        bio = null,
        website = null,
        location = null,
        phone = null,
        birth_date = null,
        is_verified = false,
        is_private = false,
        is_active = true,
        created_at = null,
        updated_at = null,
        gender = null
    ) {
        this._id = id;
        this._email = email;
        this._username = username;
        this._full_name = full_name;
        this._bio = bio;
        this._website = website;
        this._location = location;
        this._phone = phone;
        this._birth_date = birth_date;
        this._is_verified = is_verified;
        this._is_private = is_private;
        this._is_active = is_active;
        this._created_at = created_at;
        this._updated_at = updated_at;
        this._dbConn = dbConn;
        this._gender = gender
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
                SELECT * FROM users WHERE id = $1
                `, [currentId]);
            if (!result?.data || !Array.isArray(result?.data) || result?.data?.length < 1) {
                throw new Error('No valid data found with id (pk) : ', currentId);
            }
            const userData = result.data[0];
            this._id = currentId;
            this._email = userData.email;
            this._username = userData.username;
            this._full_name = userData.full_name;
            this._bio = userData.bio;
            this._website = userData.website;
            this._location = userData.location;
            this._phone = userData.phone;
            this._birth_date = userData.birth_date;
            this._is_verified = userData.is_verified;
            this._is_private = userData.is_private;
            this._is_active = userData.is_active;
            this._created_at = userData.created_at;
            this._updated_at = userData.updated_at;
            this._gender = userData.gender;
        } catch (error) {
            console.error('Failed to initialize User model. Error(s)', error);
        }
    }

    async getData() {
        try {
            if (!this._id || !this._email || !this._full_name) {
                console.log('Not initialized so here is class -> ', this);
                throw new Error('Data is not initialized');
                
            }
            return {
                id: this._id,
                email: this._email,
                username: this._username,
                full_name: this._full_name,
                bio: this._bio,
                website: this._website,
                location: this._location,
                phone: this._phone,
                birth_date: this._birth_date,
                is_verified: this._is_verified,
                is_private: this._is_private,
                is_active: this._is_active,
                created_at: this._created_at,
                updated_at: this._updated_at,
                gender: this._gender
            }
        } catch (error) {
            console.error('Failed to get data. Error(s): ', error);
            return null;
        }
    }

    // Generate username from full name
    _generateUsername(fullName) {
        const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        
        if (!fullName || !fullName.includes(' ')) {
            return `guest_${randomNum}`;
        }
        
        const parts = fullName.split(' ');
        const firstInitial = parts[0][0].toLowerCase();
        const lastName = parts.slice(1).join('').toLowerCase();
        
        return `${firstInitial}${lastName}_${randomNum}`;
    }

    async create(data) {
        try {
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            const validFields = ['id','email', 'username', 'full_name', 'bio', 'website', 'location', 'phone', 'birth_date', 'is_verified', 'is_private', 'is_active'];
            for (const key in data) {
                if (!validFields.includes(key)) {
                    throw new Error(`Invalid column field "${key}"`);
                }
            }

            // Auto-generate username if not provided
            if (!data.username && data.full_name) {
                data.username = this._generateUsername(data.full_name);
            }

            const result = await this._dbConn.client.query(`
                INSERT INTO users(email, username, full_name, bio, website, location, phone, birth_date, is_verified, is_private, is_active, id) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *;
                `, [data?.email, data?.username, data?.full_name, data?.bio, data?.website, data?.location, data?.phone, data?.birth_date, data?.is_verified, data?.is_private, data?.is_active, data?.id]);
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
            console.log('Data to update -> ', data);
            const validFields = ['email', 'username', 'full_name', 'bio', 'website', 'location', 'phone', 'birth_date', 'is_verified', 'is_private', 'is_active', 'gender'];
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
            let query = 'UPDATE users SET ';
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
            const result = await this._dbConn.client.query(`DELETE FROM users WHERE id = $1 RETURNING *`, [this._id]);
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

export class UserList {
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
            const result = await this.dbConn.fetch('SELECT * FROM users');
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error('SQL error occurred when fetching data');
            }
            result?.data?.map((row) => {
                this.data.push(
                    new User(this.dbConn, row?.id, row?.email, row?.username, row?.full_name, row?.bio, row?.website, row?.location, row?.phone, row?.birth_date, row?.is_verified, row?.is_private, row?.is_active, row?.created_at, row?.updated_at, row?.gender)
                );
            });
            console.log('Initialized all data for users -> ', this.data);
        } catch (error) {
            console.error('UserList init failed. Error(s): ', error);
        }
    }

    async getAllData() {
        try {
            if (!this.data) {
                throw new Error('Data not initialized');
            }
            const retVal = [];
            for (const user of this.data) {
                retVal.push(await user?.getData());
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
                return null;
            }
            return retVal;
        } catch (error) {
            console.error('Failed to fetch data. Error(s): ', error);
            return null;
        }
    }
}
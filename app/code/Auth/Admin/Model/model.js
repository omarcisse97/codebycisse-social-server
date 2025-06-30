import bcrypt from 'bcryptjs';

export class Admin {
    constructor(id, username, password, email, is_active, created_at) {
        this._id = id;
        this._username = username;
        this._password = password;
        this._email = email;
        this._is_active = is_active;
        this._created_at = created_at;
    }
    verify(password) {
        return bcrypt.compareSync(password, this._password);
    }
}
export class Admins {
    constructor(dbConn) {
        this._dbConn = dbConn;
        this._data = null;
    }
    async init() {
        try {
            if (!this._dbConn || this._dbConn?.status !== true) {
                throw new Error('Failed to connect to database or database module is disable');
            }
            const temp = {};
            const resultAdminFetch = await this._dbConn.fetch(`SELECT * FROM admins;`);
            if (resultAdminFetch?.data && Array.isArray(resultAdminFetch?.data) && resultAdminFetch?.data.length > 0) {
                resultAdminFetch?.data?.map((admin) => {
                    temp[admin?.id] = new Admin(
                        admin?.id,
                        admin?.username,
                        admin?.password,
                        admin?.email,
                        admin?.is_active,
                        admin?.created_at
                    );
                });
            }
            this._data = { ...temp };
        } catch (error) {
            console.error('Failed to initialize Admins. Error(s): ', error);
        }
    }
    getByEmail(email) {
        try {
            if (!this._data) {
                throw new Error('Admins data not initialized');
            }
            for (const key in this._data) {
                const admin = this._data[key];
                if (admin._email === email) {
                    return admin;
                }
            }
            return null;
        } catch (error) {
            console.error('Failed to get admin by email. Error(s): ', error);
            return null;
        }
    }



}

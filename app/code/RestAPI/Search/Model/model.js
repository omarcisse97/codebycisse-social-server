export class Search {
    constructor(dbConn) {
        this._dbConn = dbConn;
        this._result = {};
    }

    async queryUsers(q, limit = 20) {
        try {
            if (!this._dbConn || this._dbConn.status !== true) {
                throw new Error('DB Connection not established or module disabled');
            }
            // const testResult = await this._dbConn.client.query(
            //     'SELECT username FROM users WHERE username ILIKE $1 LIMIT 1',
            //     ['%test%']
            // );
            // console.log('Direct test result:', testResult);

            let query = `
            SELECT *,
            CASE
                WHEN username ILIKE $1 THEN 1
                WHEN full_name ILIKE $1 THEN 2
                WHEN username ILIKE $2 THEN 3
                WHEN full_name ILIKE $2 THEN 4
                ELSE 5
            END as relevance_score
            FROM users
            WHERE username ILIKE $1
                OR full_name ILIKE $1
                OR username ILIKE $2
                OR full_name ILIKE $2
            ORDER BY relevance_score, username`;

            if (Number(limit) !== -1) {
                query = `${query} LIMIT ${Number(limit)}`;
            }

            const result = await this._dbConn.client.query(
                query,
                [`${q}%`, `%${q}%`]  // $1 = 'search%', $2 = '%search%'
            );

            console.log('Search result -> ', result);
            if (!result?.rows) {
                throw new Error('An error occurred in the query');
            }

            this._result['users'] = result?.rows;
        } catch (error) {
            console.error(`Failed to query "${q}" in users. Error(s): ${error}`);
        }
    }
    async getResult(field, q = null, limit = null) {
        try {
            if (!(field.toLowerCase() in this._result)) {
                if (!q) {
                    throw new Error(`No result available for field "${field}" and no search param.`);
                }
                switch (field.toLowerCase()) {
                    case 'users': await this.queryUsers(q, limit); break;
                    //will implement more search types in the future
                    default: throw new Error(`Unrecognized field "${field}"`);
                }
                if (!(field.toLowerCase() in this._result)) {
                    throw new Error(`No result available for field "${field}" and failed to fetch with query "${q}"`);
                }
            }
            return this._result[field.toLowerCase()];
        } catch (error) {
            console.error(`Failed to get search result for "${field}". Error(s): ${error} `);
        }
    }
}
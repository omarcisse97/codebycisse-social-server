export class SQLData {
    constructor(dbConn) {
        this.dbConn = dbConn;
        this.tablesSQL = {};

    }

    async init() {
        console.log('Initializing Database');
        console.log('------------------------------------------------------------------');
        console.log();
        console.log();
        try {
            if (!this.dbConn || this.dbConn?.status !== true) {
                throw new Error('Failed to connect to database or database module is disable');
            }
            console.log('Loading tables ...')
            const tableNames = await this.dbConn.fetch(`
                                    SELECT table_schema, table_name
                                    FROM information_schema.tables
                                    WHERE table_type = 'BASE TABLE'
                                    AND table_schema = 'public';
                                    `);

            if (!Array.isArray(tableNames?.data)) {
                throw new Error('Loading tables failed: Database does not have any tables');
            }
            console.log('Loading tables success!');
            console.log();
            console.log('Saving tables in temp ...');
            console.log();
            const tempTablesSQL = {};

            for (const table of tableNames.data) {

                const tableName = table?.table_name;
                if (!tableName) {
                    console.log('- Cannot find table name for -> ', table);
                    console.log('- Skipping');
                    console.log();
                    continue;
                }
                console.log(`- Loading table "${tableName} ..."`);

                // Keep your original structure: columns as array, rows as array
                tempTablesSQL[tableName] = {
                    table_name: tableName,
                    columns: [],  // Array of column names
                    rows: []      // Array of row data
                };

                try {
                    const columnNames = await this.dbConn.fetch(`
                                        SELECT column_name
                                        FROM information_schema.columns
                                        WHERE table_schema = 'public'
                                        AND table_name = '${tableName}';
                                        `);

                    if (!Array.isArray(columnNames?.data) || columnNames?.data.length < 1) {
                        console.log(`- No columns found for table "${tableName}"`);
                        console.log(`- Skipping table "${tableName}"`);
                        console.log();
                        continue;
                    }
                    const column_names_temp = columnNames.data.map((value) => {
                        if (value?.column_name) {
                            return value?.column_name;
                        }
                    }).filter(Boolean); // Remove undefined values

                    if (column_names_temp && Array.isArray(column_names_temp)) {
                        tempTablesSQL[tableName].columns = [...column_names_temp];
                    }
                    console.log(`- Saved the following column names in table "${tableName}"`);
                    console.log('   Columns Names: ', column_names_temp);
                    console.log();
                    try {
                        console.log('- Loading data ...');
                        const rows = await this.dbConn.fetch(`SELECT * FROM ${tableName};`);

                        tempTablesSQL[tableName].rows = [...rows.data];
                        console.log(' - Data saved!');
                        console.log();
                    } catch (dataError) {
                        console.error('Error log: ', dataError);
                    }

                } catch (tableError) {
                    console.error('Error log: ', tableError);
                }
            }
            console.log('Saving Tables Data in temp success!');
            console.log();
            console.log('Copying temp to instance ... ');
            this.tablesSQL = { ...tempTablesSQL };
            console.log('Copy Success');
            console.log();
            console.log('Database initiliazed successfulle!');
            console.log();
            console.log('------------------------------------------------------------------');
        } catch (error) {
            console.error('Database init failed: ', error);
        }
    }

    async orderTableByColumn(table_name, column_name, sortType = 'ASC') {
        try {
            console.log(`Sorting table "${table_name}" `);
            console.log('------------------------------------------------------------------');
            console.log(`- Column: ${column_name}`);
            console.log(`- Sort type: ${sortType}`);
            console.log();
            if (sortType.toUpperCase() !== 'ASC' && sortType.toUpperCase() !== 'DESC') {
                throw new Error(`Unkown sorting type "${sortType}". Aborting`);
            }
            if (!this.dbConn || this.dbConn?.status === false) {
                throw new Error('Failed to connect to database or database module is disabled');
            }
            if (!this.tablesSQL) {
                throw new Error('Instance not initialized yet. Aborting');
            }

            if (!this.tablesSQL[table_name]) {
                throw new Error(`Table "${table_name}" does not exist or contains errors. Aborting`);
            }

            // Fixed: columns is an array, so use .includes() directly
            if (!this.tablesSQL[table_name].columns.includes(column_name)) {
                throw new Error(`Unrecognized column name "${column_name}". Aborting`);
            }

            const retVal = await this.dbConn.fetch(`
                    SELECT * FROM ${table_name} ORDER BY ${column_name} ${sortType};
                `);

            // Fixed: Update the rows array with sorted data
            if (retVal?.data && Array.isArray(retVal.data)) {
                this.tablesSQL[table_name].rows = [...retVal.data];
            }
            console.log('Sort table success!');
            console.log();
            console.log('------------------------------------------------------------------');

        } catch (error) {
            console.error('Sort table failed: ', error);
        }
    }

    getStorage() {
        return { data: this.tablesSQL || null, error: this.tablesSQL ? '' : 'Data is not initialized yet. Make sure to init to continue with operations' };
    }

    getTableByTableName(table_name) {
        return {
            data: this.tablesSQL[table_name] || null,
            error: this.tablesSQL[table_name] ? '' : `The table provided ${table_name} does not exist or contains errors`
        };
    }

    getDataOnlyByTableName(table_name) {
        return {
            data: this.tablesSQL[table_name]?.rows || null,
            error: this.tablesSQL[table_name]?.rows ? '' : `The table provided ${table_name} does not exist or contains errors`
        };
    }

    async getTablePrimaryKey(table_name) {
        console.log(`Fetching Primary Key for table "${table_name}"`);
        console.log('------------------------------------------------------------------');
        if (this?.tablesSQL[table_name] && this.dbConn) {
            try {
                const result = await this.dbConn.fetch(`SELECT a.attname AS column_name
                                                        FROM   pg_index i
                                                        JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                                         AND a.attnum = ANY(i.indkey)
                                                        WHERE  i.indrelid = '${table_name}'::regclass
                                                        AND    i.indisprimary;`);

                if (result?.error || result?.errors) {
                    throw new Error(result?.error || result?.errors || 'An issue occured while processing the data');
                }

                // Fixed: Access the first row's column_name
                if (result?.data && Array.isArray(result?.data) && result?.data?.[0]?.column_name) {
                    console.log('Successfully fetched primary key: ', result?.data?.[0]?.column_name);
                    console.log()
                    console.log('------------------------------------------------------------------');
                    return { data: result?.data?.[0]?.column_name, error: '' };
                } else {
                    console.error(`No primary keys found for  table "${table_name}"`);
                    console.log()
                    console.log('------------------------------------------------------------------');
                    return { data: '', error: `We could not find any primary keys for table -> ${table_name}` }
                }
            } catch (error) {
                console.error('An error occured while fetching primary key: ', error);
                console.log()
                console.log('------------------------------------------------------------------');
                return { data: '', error: error.message || error }
            }
        }
        console.error(`Failed to fetch Primary Key. Database is not initialized or table "${table_name}" does not exist`);
        console.log()
        console.log('------------------------------------------------------------------');
        return { data: '', error: `Failed to fetch Primary Key. Database is not initialized or table "${table_name}" does not exist` }
    }

    async sortTableByPrimaryKey(table_name, sortType = 'ASC') {
        try {
            console.log(`Sorting table "${table_name}" by Primary key`);
            console.log('------------------------------------------------------------------');
            console.log(`- Sort type: ${sortType}`);
            console.log();
            console.log();

            if (sortType.toUpperCase() !== 'ASC' && sortType.toUpperCase() !== 'DESC') {
                throw new Error(`Unkown sorting type "${sortType}". Aborting`);
            }

            const pk = await this.getTablePrimaryKey(table_name);

            if (pk?.data !== '' && pk?.error === '') {
                const finalResult = await this.dbConn.fetch(`
                    SELECT * FROM ${table_name} ORDER BY ${pk?.data} ${sortType === 'DESC' ? 'DESC' : 'ASC'};
                    `);
                if (finalResult?.error || finalResult?.errors) {
                    throw new Error(finalResult?.error || finalResult?.errors || 'An issue occured while processing the data to order table');
                }
                if (!Array.isArray(finalResult?.data)) {
                    throw new Error('PSQL result is not readable in array form');
                }

                // Update the rows with sorted data
                this.tablesSQL[table_name].rows = [...finalResult.data];
            }
        } catch (error) {
            console.error('Sorting by primary key failed: ', error);
            console.log()
            console.log('------------------------------------------------------------------');
        }
    }
    async getDataByTableNameAndPk(table_name, pk_data) {
        console.log(`Fetching Data by Primary Key for table "${table_name}"`);
        console.log(`- Primary Key Data: `, pk_data);
        try {
            if (!(table_name in this.tablesSQL)) {
                throw new Error(`Unrecognized DB table "${table_name}"`);
            }

            const pk_label = await this.getTablePrimaryKey(table_name);
            const columnsInfoRaw = await this.getColumnAndDataType(table_name);
            const columnsInfo = columnsInfoRaw?.data;
            // console.log('Pk data provided -> ', pk_data);
            // console.log('Pk label content -> ', pk_label);
            // console.log('Storage Content -> ', this.tablesSQL[table_name]);
            // console.log('All Column Info => ', columnsInfo);
            let primaryKey = null;
            columnsInfo?.map((col) => {
                if (pk_label?.data === col?.column_name) {
                    switch (col?.data_type) {
                        case 'integer':
                        case 'bigint':
                        case 'smallint':
                        case 'numeric':
                        case 'real':
                        case 'double precision':
                            primaryKey = Number(pk_data);
                            break;

                        case 'boolean':
                            primaryKey = pk_data === 'true' || pk_data === true;
                            break;

                        case 'date':
                        case 'timestamp without time zone':
                        case 'timestamp with time zone':
                            primaryKey = new Date(pk_data);
                            break;

                        default:
                            // string-based types or fallback
                            primaryKey = String(pk_data);
                            break;
                    }
                    
                }
            });
            if(!primaryKey){
                throw new Error('Could not identify primary key data type');
            }
            const retVal = this.tablesSQL[table_name]?.rows?.filter(row => row?.[pk_label?.data] === primaryKey) || null;

            
            if (!retVal) {
                console.log('No Data found');
            } else {
                console.log('Successfully fetched data');
            }
            console.log();
            console.log('------------------------------------------------------------------');
            return {
                data: retVal,
                error: retVal ? '' : 'Record not found'
            };

        } catch (error) {
            console.error('Fetching data failed: ', error);
            console.log()
            console.log('------------------------------------------------------------------');
            return {
                data: null,
                error: error
            }
        }
    }
    async updateDataByTableNameAndFields(table_name, obj, pk_data) {
        console.log(`Updating data for table "${table_name}" `);
        console.log('------------------------------------------------------------------');
        console.log('- POST Request data body: ', obj);
        console.log('- Primary Key: ', pk_data);
        console.log();
        try {
            if (!(table_name in this.tablesSQL)) {
                throw new Error(`Unrecognized DB table "${table_name}"`);
            }
            const pk = await this.getTablePrimaryKey(table_name);
            if (!pk?.data || pk?.error !== '' || !pk_data) {
                throw new Error('Primary key not found. Aborting table update!');
            }
            let query = `UPDATE ${table_name} SET `;
            let setCMD = '';
            for (let column in obj) {

                if (!this.tablesSQL[table_name].columns.includes(column) || column === '' || column === pk?.data) {
                    continue;
                }
                setCMD = `${setCMD} ${column} = '${obj[column]}',`
            }
            setCMD = setCMD.substring(0, setCMD.length - 1)
            query = `${query}${setCMD} WHERE ${pk?.data} = '${pk_data}';`;
            await this.dbConn.client.query(query);
            console.log('Update Success!')
            console.log()
            console.log('------------------------------------------------------------------');
            return true;
        } catch (error) {
            console.error('Update table failed: ', error);
            console.log()
            console.log('------------------------------------------------------------------');
            return false;
        }
    }
    async deleteRecordByTableNameAndPk(table_name, pk_data) {
        console.log(`Deleting data for table "${table_name}" `);
        console.log('------------------------------------------------------------------');
        console.log('- Primary Key: ', pk_data);
        console.log();
        try {
            const pk_label = await this.getTablePrimaryKey(table_name);
            if (pk_label?.data === '' || pk_label?.error !== '') {
                throw new Error(`No Primary Key found for table "${table_name}"`)
            }
            await this.dbConn.client.query(`DELETE FROM ${table_name} WHERE ${pk_label?.data} = '${pk_data}'`);
            console.log('Deletion success!');
            console.log()
            console.log('------------------------------------------------------------------');
            return true;
        } catch (error) {
            console.error('Deletion failed: ', error);
            console.log()
            console.log('------------------------------------------------------------------');
            return false;
        }
    }
    async getColumnAndDataType(table_name) {
        console.log(`Fetching columns names,data types, nullable, and columns default for table "${table_name}"`);
        console.log('------------------------------------------------------------------');


        try {
            if (!(table_name in this.tablesSQL)) {
                throw new Error(`Unrecognized DB table "${table_name}"`);
            }
            if (!this.dbConn || this.dbConn.status !== true) {
                throw new Error('Database is not set up or connected');
            }
            const result = await this.dbConn.fetch(`SELECT 
                                                        column_name,
                                                        data_type,
                                                        is_nullable,
                                                        column_default
                                                    FROM 
                                                        information_schema.columns
                                                    WHERE 
                                                        table_schema = 'public'  -- or whatever schema you're using
                                                        AND table_name = '${table_name}';
                                                    `);
            if (!result?.data || !Array.isArray(result?.data)) {
                throw new Error(`No columns found for table "${table_name}"`);
            }
            console.log('Fetch columns data success!');
            console.log()
            console.log('------------------------------------------------------------------');
            return { data: result?.data, error: '' };
        } catch (error) {
            console.error('Fetch columns data failed: ', error);
            console.log()
            console.log('------------------------------------------------------------------');
            return { data: null, error: error };
        }
    }
    async createRecord(table_name, data) {
        console.log(`Updating data for table "${table_name}" `);
        console.log('------------------------------------------------------------------');
        console.log('- POST Request data body: ', data);
        console.log();
        try {

            const resultCol = await this.getColumnAndDataType(table_name);
            const columnsObj = resultCol?.data;
            if (!columnsObj || !Array.isArray(columnsObj) || columnsObj.length < 1) {
                throw new Error(`No matching columns found`);
            }
            const pk = await this.getTablePrimaryKey(table_name);

            const columnsName = columnsObj?.map((value) => {
                let push = pk?.data && value.column_name === pk?.data ? false : true;
                if (push) return value.column_name;
                return '';
            });
            if (!columnsName || !Array.isArray(columnsName) || columnsName.length < 1) {
                throw new error('No valid column in table');
            }
            const columnForOp = [];
            const dataOp = [];
            for (const column_name_key in data) {
                if (column_name_key !== 'successRedirectURL') {
                    if (column_name_key === '' || !columnsName.includes(column_name_key)) {
                        throw new Error(`Column "${column_name_key}" not found`);
                    }
                    columnForOp.push(column_name_key);
                    dataOp.push(`'${data[column_name_key]}'`);
                } else {
                    console.log(` - Skipping key ${column_name_key}`);
                }


            }

            let columnDeclaration = `INSERT INTO ${table_name} (${columnForOp?.join(',')})`;
            let insertDeclaration = `VALUES (${dataOp.join(',')}) RETURNING *;`;

            const result = await this.dbConn.client.query(`
                ${columnDeclaration} ${insertDeclaration}
                `);
            if (!result?.command || !result?.rowCount || result?.rowCount < 1) {
                throw new Error(`SQL Insert failed. Details of OP: "${result}"`);
            }
            const retVal = result?.rows;
            if (!retVal || !Array.isArray(retVal) || retVal.length < 1) {
                console.log('failed to retrieve newly created record');
                console.log()
                console.log('------------------------------------------------------------------');
                return { data: null, error: '', success: true };
            }
            console.log('- Create record success!');
            console.log('- Info => ', retVal?.[0]);
            console.log()
            console.log('------------------------------------------------------------------');
            return { data: retVal?.[0]?.[pk?.data], error: '', success: true };


        } catch (error) {
            console.error('Create record failed: ', error);
            console.log()
            console.log('------------------------------------------------------------------');
            return { data: null, error: error, success: false };
        }
    }
}
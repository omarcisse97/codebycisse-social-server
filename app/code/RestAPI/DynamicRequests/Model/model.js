import { ModuleMetaData } from "../../register.js";

export const isFetchValid = (result) => {
    return result ?
        result?.error === '' &&
            result?.data &&
            Array.isArray(result?.data) ?
            true : false
        : false;
}

export const isDBOk = (db) => {
    return db ?
        db?.getErrors()?.length === 0 &&
            db?.status === true ?
            true : false
        : false;
}

export const getConnection = (param, instance) => {
    return param && isDBOk(param) === true ? param : !param && isDBOk(instance) === true ? instance : null;
}

export const dbErrorMsg = (db) => {
    return `Database is not connected or module disabled. Details: ${db?.getErrors() ? db?.getErrors() : 'No details'}`;
}

export const fetchErrorMsg = (result, schema_name = 'Unknown or no schema', etc = '') => {
    return `Failed to fetch from "${schema_name}". ${etc} ${result?.error ? result?.error : ''}`;
}

export const globalSysFetchQuery = (type = 'all_tables') => {
    switch (type?.toLowerCase()) {
        case 'all_tables':
            return `SELECT table_schema, table_name
                        FROM information_schema.tables
                    WHERE table_type = 'BASE TABLE'
                    AND table_schema = 'public';
                    `;
        case 'all_columns':
            return `SELECT column_name
                        FROM information_schema.columns
                    WHERE table_schema = 'public'
                    AND table_name = $1;`;
        case 'primary_key':
            return `SELECT a.attname AS column_name
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid
                        AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = $1::regclass
                    AND i.indisprimary;`;
        default: return '';
    }
}

export const doesColumnExist = (columnInput, columnsDB = []) => {
    return columnInput !== '*' && (columnsDB?.includes(columnInput) ||
        columnsDB?.includes(columnInput.toLowerCase()) ||
        columnsDB?.includes(columnInput.toUpperCase())) ? true : columnInput === '*' ? true : false;
}

export const doesSchemaExist = (schema_name) => {
    const metadata = ModuleMetaData(null, schema_name);
    return !metadata || (Array.isArray(metadata) && metadata?.length < 1) ? false : true;
}

export const checkOperators = (operator) => {
    return operator !== '=' &&
        operator !== '<>' &&
        operator !== '<' &&
        operator !== '>' &&
        operator !== '<=' &&
        operator !== '>=' ? false : true;
}

export const generateQueryClause = (type = 'WHERE', obj, cont = false, sequence = 1) => {
    if (!obj || typeof obj !== 'object') {
        return null;
    }
    if (Object.keys(obj).length < 1) {
        return { query: '', parameterized: [], paramSize: 0 };
    }
    
    let query = type.toUpperCase();
    if (query !== 'WHERE' && query !== 'SET') {
        return null;
    }
    console.log(`${query} quest in progress`);
    console.log('Obj content -> ', obj);
    let parameterized = cont === true ? sequence : 1;
    const parameterizedArr = [];
    let track = 1;
    for (const col in obj) {
        let operator = '';
        let data = null;
        if (type.toUpperCase() === 'WHERE') {
            if (typeof obj[col] !== 'object') {
                return null;
            }
            if (!('operator' in obj[col])) {
                return null;
            }
            if (!('data' in obj[col])) {
                return null;
            }
            operator = obj[col].operator;
            data = obj[col]?.data;
        } else if (type.toUpperCase() === 'SET') {
            if (typeof obj[col] === 'object') {
                return null;
            }
            operator = '=';
            data = obj[col];
        } else {
            return null;
        }

        if (checkOperators(operator) === false || !data) {
            return null;
        }
        if (track > 1) {
            if(type?.toUpperCase() === 'WHERE'){
                query = `${query} AND `;
            } else if(type?.toUpperCase() === 'SET'){
                query = `${query}, `;
            }
            
        }

        query = `${query} ${col} ${operator} $${parameterized}`;
        parameterized += 1;
        track += 1;
        parameterizedArr.push(data);
    }
    console.log('Built query -> ', query);
    return { query: query, parameterized: parameterizedArr, paramSize: parameterizedArr.length };
}

export const generateValuesQuery = (values = []) => {
    if (!Array.isArray(values) || values?.length < 1) {
        return null;
    }
    let query = 'VALUES (';
    for (let i = 0; i < values.length; i++) {
        if (i > 0) {
            query = `${query}, `;
        }
        query = `${query}$${i + 1}`;
    }
    query = `${query})`;
    return { query: query, parameterized: values };
}

export const createQuery = (
    type = 'SELECT',
    columns = ['*'],
    schema_name,
    where = {},
    set = {},
    values = [],
    checkColumns = false,
    columnsDB = null,
    orderBy = null
) => {

    try {
        if (!Array.isArray(columns)) {
            throw new Error('Columns must be provided in array form');
        }
        if (!schema_name) {
            throw new Error('Must provide a schema name');
        }

        if (doesSchemaExist(schema_name) === false) {
            throw new Error('schema does not exist');
        }

        if (checkColumns === true) {
            if (!columnsDB) {
                throw new Error('Cannot validate input columns if db columns are not provided');
            }
            if (Object.keys(where).length > 0) {
                for (const col in where) {
                    if (doesColumnExist(col, columnsDB) === false) {
                        throw new Error(`Column "${col}" does not exist in provided schema`);
                    }
                }
            }
            if (Object.keys(set).length > 0) {
                for (const col in set) {
                    if (doesColumnExist(col, columnsDB) === false) {
                        throw new Error(`Column "${col}" does not exist in provided schema`);
                    }
                }
            }
            columns?.map((col) => {
                if (doesColumnExist(col, columnsDB) === false) {
                    throw new Error(`Column "${col}" does not exist in provided schema`);
                }
            });

            if (orderBy && orderBy?.identifier) {
                if (doesColumnExist(orderBy?.identifier, columnsDB) === false) {
                    throw new Error(`Column "${orderBy?.identifier}" cannot get sorted since it does not exist`)
                }
            }
        }

        let query = '';
        let orderByQuery = '';

        if (orderBy && orderBy?.identifier) {
            orderByQuery = `ORDER BY ${orderBy?.identifier} ${orderBy?.type === 'ASC' || orderBy?.type === 'DESC' ? orderBy?.type : 'ASC'}`
        }
        const whereQuery = generateQueryClause('WHERE', where);
        if (!whereQuery) {
            throw new Error('Error generating WHERE statement');
        }
        const setQuery = generateQueryClause('SET', set, true, whereQuery?.paramSize + 1);
        if (!setQuery) {
            throw new Error('Error generating SET statement')
        }
        const valuesQuery = generateValuesQuery(values);

        const parameterized = [...whereQuery.parameterized, ...setQuery.parameterized];

        switch (type.toUpperCase()) {
            case 'SELECT':
                return {
                    query: `SELECT ${columns?.join(',')} FROM ${schema_name} ${whereQuery.query} ${orderByQuery};`,
                    parameterized: parameterized
                }
            case 'UPDATE':
                if (setQuery.query === '') {
                    throw new Error('UPDATE query needs set statements');
                }
                if (parameterized.length < 1) {
                    throw new Error('UPDATE statement needs set data');
                }
                console.log('Full Query -> ', `UPDATE ${schema_name} ${setQuery.query} ${whereQuery.query} RETURNING *;`);
                return {
                    query: `UPDATE ${schema_name} ${setQuery.query} ${whereQuery.query} RETURNING *;`,
                    parameterized: parameterized
                }
            case 'DELETE':
                return {
                    query: `DELETE FROM ${schema_name} ${whereQuery.query} RETURNING *;`,
                    parameterized: parameterized
                }
            case 'INSERT':
                if (!valuesQuery) {
                    throw new Error('Values are required when inserting data');
                }
                if (valuesQuery?.parameterized?.length !== columns?.length) {
                    throw new Error('Values length must match columns length');
                }
                return {
                    query: `INSERT INTO ${schema_name} (${columns?.join(',')}) ${valuesQuery.query} RETURNING *;`,
                    parameterized: valuesQuery?.parameterized
                }
            default: return null;
        }
    } catch (error) {
        console.error('Failed to generate query. Error(s): ', error);
        return null;
    }
}

export const returnJSONData = (resultData) => {
    if (!Array.isArray(resultData)) {
        return null;
    }
    return JSON.stringify(resultData);
}
export const returnDataObj = (resultData) => {
    if (!Array.isArray(resultData)) {
        return null;
    }
    if (resultData?.length > 1) {
        return resultData;
    }

    return resultData?.[0] ?? [];
}

export class Schema {
    constructor(module_name, schema_name, dbConn = null) {
        this._schema_name = schema_name;
        this._dbConn = dbConn;
        this._columns = [];
        this._data = [];
        this._pk = null;
        this._module_name = module_name;
    }

    async init(schema_name = this._schema_name, loadAllData = false, dbConn = null) {
        try {
            this._columns = [];
            this._data = [];
            this._schema_name = schema_name !== this._schema_name ? schema_name : this._schema_name;
            const conn = getConnection(dbConn, this._dbConn);

            if (isDBOk(conn) === false) {
                throw new Error(dbErrorMsg(conn));
            }

            let query = globalSysFetchQuery('all_columns');
            if (query === '') {
                throw new Error('Failed to create query to load all columns');
            }

            const columnNamesResult = await conn.fetch(query, [this._schema_name]);
            if (isFetchValid(columnNamesResult) === false) {
                throw new Error(fetchErrorMsg(columnNamesResult, this._schema_name, 'Column Names'));
            }

            this._columns = columnNamesResult?.data?.map(row => row.column_name) || [];;

            if (this._columns.length > 0) {
                query = globalSysFetchQuery('primary_key');
                if (query === '') {
                    throw new Error('Failed to create query to load primary key');
                }

                const pkResult = await conn.fetch(query, [this._schema_name]);
                if (isFetchValid(pkResult) === false) {
                    throw new Error(fetchErrorMsg(pkResult, this._schema_name, 'Primary Key'));
                }

                this._pk = pkResult?.data.length > 0 ? pkResult?.data?.[0].column_name : null;
            }

            if (this._columns.length > 0 && loadAllData === true) {
                const dataResult = await conn.fetch(`SELECT * FROM ${this._schema_name}`, []);

                if (isFetchValid(dataResult) === false) {
                    throw new Error(fetchErrorMsg(dataResult, this._schema_name, 'Data'));
                }
                this._data = dataResult?.data;
            }

        } catch (error) {
            console.error('Failed to initialize schema. Error(s): ', error);
        }
    }

    getColumns() {
        return this._columns;
    }

    getData() {
        return this._data;
    }

    getPrimaryKey() {
        return this._pk;
    }

    getSchemaName() {
        return this._schema_name;
    }

    async getRecordByPK(pkValue, dbConn = null) {
        try {
            const conn = getConnection(dbConn, this._dbConn);
            if (isDBOk(conn) === false) {
                throw new Error(dbErrorMsg(conn));
            }

            if (!this._pk) {
                throw new Error('Primary key not found for this schema');
            }

            const result = await conn.fetch(
                `SELECT * FROM ${this._schema_name} WHERE ${this._pk} = $1`,
                [pkValue]
            );

            if (isFetchValid(result) === false) {
                throw new Error(fetchErrorMsg(result, this._schema_name, 'Record by PK'));
            }

            return { data: result.data, error: '' };
        } catch (error) {
            console.error('Failed to get record by PK. Error(s): ', error);
            return { data: null, error: error.message || error };
        }
    }

    async getSchemaData(columns = ['*'], where = {}, formattedJSON = false, orderBy = null, dbConn = null) {
        try {
            const conn = getConnection(dbConn, this._dbConn);
            const metadata = ModuleMetaData(this._module_name);
            if (!metadata) {
                throw new Error('Failed to obtain metadata');
            }
            if (metadata?.schema !== this._schema_name) {
                throw new Error('Module error. Schema does not match module metadata');
            }
            if (!metadata?.routes.includes('GET')) {
                throw new Error(`GET request is not enabled for module "${this._module_name}"`);
            }
            if (isDBOk(conn) === false) {
                throw new Error(dbErrorMsg(conn));
            }

            const queryBuilder = createQuery('SELECT', columns, this._schema_name, where, {}, [], true, this._columns, orderBy);
            if (!queryBuilder || !queryBuilder?.query || !Array.isArray(queryBuilder?.parameterized)) {
                throw new Error('Failed to build query');
            }

            const result = await conn.fetch(queryBuilder.query, queryBuilder.parameterized);
            if (isFetchValid(result) === false) {
                throw new Error(fetchErrorMsg(result, this._schema_name, 'Data requested'));
            }

            const retVal = formattedJSON === true ? returnJSONData(result?.data) : returnDataObj(result?.data);
            if (!retVal) {
                throw new Error('Could not create returned data object JSON or array');
            }
            return { data: retVal, error: '' };

        } catch (error) {
            console.error('Failed to get data. Error(s): ', error);
            return { data: null, error: error.message || error };
        }
    }
    async customDataOperation(
        request = 'GET',
        columns = ['*'],
        where = {},
        set = {},
        values = [],
        checkColumns = false,
        formattedJSON = false,
        orderBy = null,
        dbConn = null
    ) {
        try {
            const conn = getConnection(dbConn, this._dbConn);
            const metadata = ModuleMetaData(this._module_name);

            if (!metadata) {
                throw new Error('Failed to obtain metadata');
            }
            if (metadata?.schema !== this._schema_name) {
                throw new Error('Module error. Schema does not match module metadata');
            }
            if (!metadata?.routes.includes(request?.toUpperCase())) {
                throw new Error(`${request?.toUpperCase()} request is not enabled for module "${this._module_name}"`);
            }
            if (isDBOk(conn) === false) {
                throw new Error(dbErrorMsg(conn));
            }
            const operationType = request?.toUpperCase() === 'GET' ?
                'SELECT' :
                request?.toUpperCase() === 'POST' ?
                    'INSERT' :
                    request?.toUpperCase() === 'PUT' ?
                        'UPDATE' :
                        request?.toUpperCase() === 'DELETE' ?
                            'DELETE' :
                            '';
            const queryBuilder = createQuery(
                operationType,
                columns,
                this._schema_name,
                where,
                set,
                values,
                checkColumns,
                this._columns,
                orderBy
            );
            if (!queryBuilder || !queryBuilder?.query || !queryBuilder?.parameterized) {
                throw new Error('Failed to build query');
            }
            const result = await conn.fetch(queryBuilder?.query, queryBuilder?.parameterized);
            console.log('CUSTOM DATA OPERATION RESULT -> ', result);
            if (isFetchValid(result) === false) {
                throw new Error(fetchErrorMsg(result, this._schema_name, `for operation type "${operationType}"`));
            }
            const retVal = formattedJSON === true ? returnJSONData(result?.data) : returnDataObj(result?.data);
            if (!retVal) {
                throw new Error('Could not create returned data object JSON or array');
            }
            return { data: retVal, error: '' };
        } catch (error) {
            console.error('Failed to perform API operation. Error(s): ', error);
            return { data: null, error: error.message || error };
        }

    }
    async search(q, limit = 20, searchFor = ['*'], fields = ['*'], formattedJSON = false, dbConn) {
        try {
            let colToSearch = null;
            const conn = getConnection(dbConn, this._dbConn);
            const metadata = ModuleMetaData(this._module_name);
            console.log('SEARCH: ');
            console.log(' - Q -> ', q);
            console.log(' - Limit: ', limit);
            console.log('SearchFor: ', searchFor);
            console.log('Fields - ', fields);



            if (!metadata) {
                throw new Error('Failed to obtain metadata');
            }
            if (metadata?.schema !== this._schema_name) {
                throw new Error('Module error. Schema does not match module metadata');
            }
            if (!metadata?.routes.includes('GET')) {
                throw new Error(`GET request is not enabled for module "${this._module_name}"`);
            }
            if (isDBOk(conn) === false) {
                throw new Error(dbErrorMsg(conn));
            }

            if (searchFor.length === 1 && searchFor[0] === '*') {
                colToSearch = this._columns;
            } else if (searchFor.length >= 1 && searchFor[0] !== '*') {
                for (const searchField of searchFor) {
                    if (!this._columns?.includes(searchField)) {
                        throw new Error(`Search for field ${searchField} does not exist in db`);
                    }
                }
                colToSearch = searchFor;
            }
            if (colToSearch === null) {
                throw new Error('Could not establish search for fields');
            }
            if (fields?.length >= 1 && fields[0] !== '*') {
                for (const f of fields) {
                    if (!this._columns?.includes(f)) {
                        throw new Error(`Column ${f} not found`);
                    }
                }
            }

            // FIXED: Proper SQL query construction
            let selectFields = '';
            for (let i = 0; i < fields.length; i++) {
                if (i > 0) selectFields += ', ';
                selectFields += fields[i];
            }

            let query = `SELECT ${selectFields}, CASE`;
            let whereQuery = '';

            // Build CASE statement and WHERE clause
            for (let i = 0; i < colToSearch?.length; i++) {
                // CASE statement for relevance scoring
                query += ` WHEN ${colToSearch[i]} ILIKE $1 THEN ${i + 1}`;
                query += ` WHEN ${colToSearch[i]} ILIKE $2 THEN ${i + 2}`;

                // WHERE clause
                if (i === 0) {
                    whereQuery = 'WHERE';
                } else {
                    whereQuery += ' OR';
                }
                whereQuery += ` ${colToSearch[i]} ILIKE $1 OR ${colToSearch[i]} ILIKE $2`;
            }

            // Complete the query
            query += ` ELSE ${colToSearch?.length + 2} END AS relevance_score`;
            query += ` FROM ${this._schema_name} ${whereQuery}`;
            query += ` ORDER BY relevance_score`;

            if (Number(limit) !== -1) {
                query += ` LIMIT ${Number(limit)}`;
            }

            console.log('Generated search query:', query);
            console.log('Search parameters:', [`${q}%`, `%${q}%`]);

            const result = await conn.fetch(query, [`${q}%`, `%${q}%`]);
            if (isFetchValid(result) === false) {
                throw new Error(fetchErrorMsg(result, this._schema_name, 'Search For'));
            }

            const retVal = formattedJSON === true ? returnJSONData(result?.data) : result?.data;
            console.log('SEARCH RESULT ->>>>>> ', retVal);
            return { data: retVal, error: '' };

        } catch (error) {
            console.error('Search failed. Error(s): ', error);
            return { data: null, error: error.message || error };
        }
    }
}

export class SQLData {
    constructor(dbConn) {
        this._dbConn = dbConn;
        this._schemas = {};
    }

    async init(module_name = null, loadAllData = false, dbConn = null) {
        try {
            this._schemas = {};
            let conn = getConnection(dbConn, this._dbConn);
            if (isDBOk(conn) === false) {
                throw new Error(dbErrorMsg(conn));
            }

            const metadata = ModuleMetaData(module_name);
            if (!metadata) {
                throw new Error('Failed to obtain module metadata');
            }

            let tableNamesResult = await this._dbConn.fetch(globalSysFetchQuery('all_tables'), []);
            if (isFetchValid(tableNamesResult) === false) {
                throw new Error(fetchErrorMsg(tableNamesResult, 'all tables', 'table names'));
            }

            this._schemas[module_name] = new Schema(module_name, metadata?.schema, this._dbConn);
            await this._schemas[module_name].init(metadata?.schema, loadAllData, this._dbConn);

        } catch (error) {
            console.error('Failed to initialize schema request. Error(s): ', error);
        }
    }

    getSchemas() {
        return this._schemas;
    }

    getSchema(schemaName) {
        return this._schemas[schemaName] || null;
    }

    async refreshSchema(schemaName, loadAllData = false, dbConn = null) {
        try {
            if (this._schemas[schemaName]) {
                await this._schemas[schemaName].init(schemaName, loadAllData, dbConn);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to refresh schema. Error(s): ', error);
            return false;
        }
    }

}
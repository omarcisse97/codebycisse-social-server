import { SQLData, isDBOk, dbErrorMsg } from "../Model/model.js";
import { ApiKeys } from "../../ApiKeyManagement/Model/ApiKey.js";
import { ModuleMetaData } from "../../register.js";
const isExpired = (expires_at) => {
    const now = new Date();
    return new Date(expires_at) < now;
};
const validateController = (method, api_key, module, resolution = null, dbConn = null) => {
    if (!method || (method !== 'POST' && method !== 'GET' && method !== 'PUT' && method !== 'DELETE')) {
        return { isValid: false, error: 'Unknown request method' };
    }
    if (!resolution) {
        return { isValid: false, error: 'Resolution instance not found' };
    }
    if (isDBOk(dbConn) === false) {
        return { isValid: false, error: dbErrorMsg(dbConn) };
    }
    if (!module) {
        return { isValid: false, error: 'Missing module to handle request' }
    }
    if (!api_key) {
        return { isValid: false, error: 'Missing API key' }
    }

    return { isValid: true, error: '' };

}
const validateAPIKey = async (api_key, dbConn, method) => {
    const apiKeys = new ApiKeys(dbConn);
    await apiKeys.init();
    const resultFoundApi = await apiKeys.getApiByKey(api_key);
    if (!resultFoundApi?.data) {
        return { isValid: false, error: 'Invalid API key' };
    }
    if (isExpired(resultFoundApi?.data?.expires_at)) {
        if (resultFoundApi?.data?.is_active === true) {
            await apiKeys?.toggleActive(api_key);
            resultFoundApi.data.is_active = false;
        }
    }
    if (resultFoundApi?.data?.is_active !== true) {
        return { isValid: false, error: 'API key expired or is not active' };
    }
    switch (method.toUpperCase()) {
        case 'GET':
            if (resultFoundApi?.data?.access !== 'read' && resultFoundApi?.data?.access !== 'read-update') {
                return { isValid: false, error: `Insufficient API permission. Current API access: "${resultFoundApi?.data?.access}" ` }
            }
            break;
        case 'POST':
        case 'PUT':
            if (resultFoundApi?.data?.access !== 'update' && resultFoundApi?.data?.access !== 'read-update') {
                return { isValid: false, error: `Insufficient API permission. Current API access: "${resultFoundApi?.data?.access}" ` }
            }
            break;
        case 'DELETE':
            if (resultFoundApi?.data?.access !== 'delete') {
                return { isValid: false, error: `Insufficient API permission. Current API access: "${resultFoundApi?.data?.access}" ` }
            }
            break;
        default:
            return { isValid: false, error: 'Failed to read method request' }
    }
    return { isValid: true, error: '' };
}

const createWhereObj = (tempWhere = []) => {
    const where = {};
    if (tempWhere.length > 0) {
        for (let i = 0; i < tempWhere?.length; i++) {
            let tempArr = null;
            let operator = '';
            if (tempWhere?.[i]?.includes('<=')) {
                tempArr = tempWhere?.[i]?.split('<=') ?? null;
                operator = '<=';
            } else if (tempWhere?.[i]?.includes('>=')) {
                tempArr = tempWhere?.[i]?.split('>=') ?? null;
                operator = '>=';
            } else if (tempWhere?.[i]?.includes('<>')) {
                tempArr = tempWhere?.[i]?.split('<>') ?? null;
                operator = '<>'
            } else if (tempWhere?.[i]?.includes('>')) {
                tempArr = tempWhere?.[i]?.split('>') ?? null;
                operator = '>'
            } else if (tempWhere?.[i]?.includes('<')) {
                tempArr = tempWhere?.[i]?.split('<') ?? null;
                operator = '<'
            } else if (tempWhere?.[i]?.includes('=')) {
                tempArr = tempWhere?.[i]?.split('=') ?? null;
                operator = '='
            } else {
                continue;
            }
            if (!tempArr || operator === '' || (Array.isArray(tempArr) && tempArr.length < 2)) {
                continue;
            }
            where[tempArr[0]] = {
                operator: operator,
                data: tempArr[1]
            };

        }

    }
    return where;
}
const displayRequestInfo = (request) => {
    console.log('New Request: ');
    console.log('- Method: ', request?.method);
    console.log('- Headers: ', request?.headers);
    console.log('- Params: ', request?.params);
    console.log('- Body: ', request?.body);
}
const Controller = async (request = null, resolution = null, dbConn = null, appGlobal = null) => {
    try {
        const method = request?.method;
        const body = request?.body ?? {};
        const headers = request?.headers ?? {};
        const params = request?.params ?? {};
        const api_key = headers?.api_key ?? null;
        const clause = headers?.clause ?? null;
        const fields = headers?.fields ?? null;
        const limit = headers?.limit ?? null;
        const orderBy = headers?.orderBy ?? null;
        const isSearch = headers?.search ?? false;
        const formattedJSON = headers?.formattedJSON ?? false;
        const module = params?.module ?? null;
        const set = body?.update ?? {};
        const insert = body?.push ?? [];

        displayRequestInfo(request);

        const controllerValidation = validateController(method, api_key, module, resolution, dbConn);
        if (controllerValidation?.error !== '') {
            throw new Error(controllerValidation?.error);
        }

        const apiKeyValidation = await validateAPIKey(api_key, dbConn, method);
        if (apiKeyValidation?.error !== '') {
            throw new Error(apiKeyValidation?.error);
        }

        const metadata = ModuleMetaData(module);
        if (!metadata) {
            throw new Error('Failed to find module metadata');
        }

        if (!metadata?.routes?.includes(method)) {
            throw new Error(`Route "${method}" is not enabled for module "${module}"`);
        }
        const sqlData = new SQLData(dbConn);
        await sqlData.init(module, false);
        const activeSchema = sqlData.getSchema(metadata?.schema);
        //getSchemaData(columns = ['*'], where = {}, formattedJSON = false, dbConn = null)

        const columns = fields ? fields?.split(',') : ['*'];
        const where = createWhereObj(clause?.split(',') ?? []);

        switch (method) {
            case 'GET':
                let data = null;
                if (isSearch === false) {
                    data = await activeSchema?.getSchemaData(columns, where, formattedJSON, orderBy, dbConn);
                    if (data?.error) {
                        throw new Error(data?.error);
                    }
                } else {
                    console.log('-----------------ITS A SEARCH---------------------------------');
                    const q = headers?.q ?? null;
                    const searchFor = headers?.searchfor?.split(',') ?? null;
                    if(!searchFor){
                        throw new Error('Invalid search for option');
                    }
                    console.log('Search for from request -> ', searchFor);
                    if (!q) {
                        throw new Error(`Cannot perform search ${module} without query parameter`);
                    }
                    console.log('SearchFor -> ', searchFor);
                    data = await activeSchema?.search(q, limit, searchFor, columns, formattedJSON, dbConn);
                    console.log('After retrieval ', data);
                    if (!data || (data && (!data?.data || data?.error !== ''))) {
                        throw new Error(`Failed to search data. error in model => ${data?.error ? data?.error : 'No error message available'}`);
                    }
                }
                // console.log('GET Request success. Data -> ', data);
                return resolution?.json({
                    success: true,
                    error: '',
                    data: data?.data
                });
            case 'POST':
            case 'PUT':
            case 'DELETE':
                if (method === 'PUT' && Object.keys(set?.data).length < 1) {
                    throw new Error('Missing SET data for updates');
                }
                if (method === 'PUT' && Object.keys(where).length < 1) {
                    throw new Error('Must provide a where clause in order to update data');
                }
                if (method === 'POST' && insert.length < 1) {
                    throw new Error('Missing data to create');
                }
                if (method === 'DELETE' && Object.keys(where).length < 1) {
                    throw new Error('Must provide a where clause in order to delete data');
                }

                const resultUpdate = await activeSchema?.customDataOperation(method, columns, where, set?.data, insert,true, formattedJSON, orderBy, dbConn);
                if (resultUpdate?.error) {
                    throw new Error(resultUpdate?.error);
                }
                
                return resolution?.json({
                    success: true,
                    error: '',
                    data: resultUpdate?.data
                });
            default: throw new Error('Unknown request');

        }

    } catch (error) {
        if (!resolution) {
            return { success: false, error: error, view: JSON.stringify({ error: error.message }) }
        }
        return resolution.json({
            success: false,
            data: null,
            error: error.message
        });

    }

};
export default Controller;
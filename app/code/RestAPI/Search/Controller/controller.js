import { DbConn } from "./configDB.js";
import { ApiKeys } from "../../ApiKeyManagement/Model/ApiKey.js";
import { Search } from "../Model/model.js";

const isExpired = (expires_at) => {
  const now = new Date();
  return new Date(expires_at) < now;
};

const Controller = async (request = null, resolution = null) => {
  try {
    const method = request?.method;
    const params = request?.params ?? {};
    const headers = request?.headers ?? {};
    if (!method || method !== 'GET') {
      throw new Error('Unknown request method');
    }
    if (!params || !params?.limit || !params?.field || !headers?.q) {
      throw new Error('Missing crucial params (limit, field, or query)');
    }
    if (!resolution) {
      throw new Error('Resolution instance not found');
    }

    const dbConn = await DbConn();
    if (dbConn?.error !== '') {
      throw new Error(`Database Connection Error: An error occurred while connecting to the database.
            Please contact your local administrator as soon as possible. Errors: ${dbConn.error}`);
    }
    await dbConn.module.connect();
    if (dbConn.module.getErrors().length > 0) {
      throw new Error('Database Connection Error: Server could not establish connection with the database. Please contact your local administrator as soon as possible');
    }
    if (!request?.headers) {
      throw new Error('Missing crucial headers');
    }
    if (!request?.headers?.api_key) {
      throw new Error('Missing API key');
    }
    const apiKeys = new ApiKeys(dbConn.module);
    await apiKeys.init();
    const resultFoundApi = await apiKeys.getApiByKey(headers?.api_key);

    if (!resultFoundApi?.data) {
      throw new Error('Invalid API Key');
    }
    if (isExpired(resultFoundApi?.data?.expires_at)) {
      if (resultFoundApi?.data?.is_active === true) {
        await apiKeys?.toggleActive(headers?.api_key);
        resultFoundApi.data.is_active = false;
      }

    }
    if (resultFoundApi?.data?.is_active !== true) {
      throw new Error('Api Key expired. Please use a valid Api Key');
    }
    if (resultFoundApi?.data?.access !== 'read' && resultFoundApi?.data?.access !== 'read-update') {
      throw new Error(`Unsufficient API permission. Current API access: "${resultFoundApi?.data?.access}" `)
    }

    const field = params?.field;
    const limit = !Number.isNaN(Number(params?.limit)) && params?.limit.trim() !== '' === true ? Number(params?.limit) : -1;
    const search = new Search(dbConn.module);
    const q = headers?.q;
    switch (field) {
      case 'users':
        await search.queryUsers(q, limit);
        const result = await search.getResult(field);
        return resolution?.json({
          success: true,
          data: result ?? [],
          error: ''
        });
      default: throw new Error(`Failed to identify field ${field} to perform query`);
    }

  } catch (error) {
    if (!resolution) {
      return { success: false, error: error, view: JSON.stringify({ error: error.message }) }
    }
    resolution.json({
      success: false,
      data: null,
      error: error.message
    });
    return { success: false, error: error, view: '' };

  }
};
export default Controller;
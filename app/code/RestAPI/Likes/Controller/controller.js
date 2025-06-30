import { DbConn } from "./configDB.js";
import { ApiKeys } from "../../ApiKeyManagement/Model/ApiKey.js";
import { LikeList, Like } from "../Model/model.js";

const isExpired = (expires_at) => {
  const now = new Date();
  return new Date(expires_at) < now;
};

const Controller = async (request = null, resolution = null) => {
  try {
    const method = request?.method;
    const params = request?.params ?? {};
    const body = request?.body ?? {};
    if (!method || (method !== 'POST' && method !== 'GET' && method !== 'PUT' && method !== 'DELETE')) {
      throw new Error('Unknown request method');
    }
    if (!params || !params?.handle) {
      throw new Error('Missing crucial params');
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
    if (!request?.body) {
      throw new Error('Missing crucial params');
    }
    if (!request?.body?.api_key) {
      throw new Error('Missing API key');
    }
    const apiKeys = new ApiKeys(dbConn.module);
    await apiKeys.init();
    const resultFoundApi = await apiKeys.getApiByKey(body?.api_key);

    if (!resultFoundApi?.data) {
      throw new Error('Invalid API Key');
    }
    if (isExpired(resultFoundApi?.data?.expires_at)) {
      if (resultFoundApi?.data?.is_active === true) {
        await apiKeys?.toggleActive(body?.api_key);
        resultFoundApi.data.is_active = false;
      }

    }
    if (resultFoundApi?.data?.is_active !== true) {
      throw new Error('Api Key expired. Please use a valid Api Key');
    }
    const id = params?.handle;
    if (!id) {
      throw new Error('Missing crucial param to update data');
    }

    const likeList = new LikeList(dbConn.module);
    await likeList.init();
    switch (method) {
      case 'GET':
        if (resultFoundApi?.data?.access !== 'read' && resultFoundApi?.data?.access !== 'read-update') {
          throw new Error(`Unsufficient API permission. Current API access: "${resultFoundApi?.data?.access}" `)
        }
        if (id === 'all') {
          const result = await likeList?.getAllData();
          let retVal = [];
          if(body?.limit){
            if(result?.length < body?.limit){
              throw new Error('Limit is higher than data size');
            }
            for(let i = 0; i < body?.limit; i++){
              if(i < result?.length){
                retVal.push(result[i]);
              }
            }
          } else {
            retVal = [...result];
          }
          return resolution?.json({
            success: true,
            data: retVal ?? [],
            error: ''
          });
        }
        else {
          const likeReturnData = await likeList?.getDataByID(id);
          if (!likeReturnData) {
            throw new Error(`Data not found. Invalid ID "${body?.id}"`);
          }
          const retValFetch = await likeReturnData?.getData();
          return resolution?.json({
            success: true,
            data: retValFetch ?? {},
            error: ''
          });
        }

      case 'POST':
        if (resultFoundApi?.data?.access !== 'update' && resultFoundApi?.data?.access !== 'read-update') {
          throw new Error(`Unsufficient API permission. Current API access: "${resultFoundApi?.data?.access}" `)
        }
        if (!body?.data) {
          throw new Error('Missing data for create API operation');
        }
        // if (
        //   !('sname' in body?.data) ||
        //   !('status' in body?.data) ||
        //   !('city' in body?.data)
        // ) {
        //   throw new Error('Missing fields in data body');
        // }
        const newLike = new Like(dbConn.module);
        const objReturn = await newLike.create(body?.data);
        if (!objReturn) {
          throw new Error('Failed to create or retrieve record');
        }
        return resolution?.json({
          success: true,
          error: '',
          data: objReturn
        });

      case 'PUT':
        if (resultFoundApi?.data?.access !== 'update' && resultFoundApi?.data?.access !== 'read-update') {
          throw new Error(`Unsufficient API permission. Current API access: "${resultFoundApi?.data?.access}" `)
        }


        const tmpSup = await likeList?.getDataByID(id);
        if (!tmpSup) {
          throw new Error('Record not found');
        }
        const updatedRecord = await tmpSup?.update(body?.data);
        if (!updatedRecord) {
          throw new Error('Failed to update or retrieve record');
        }
        return resolution?.json({
          success: true,
          data: updatedRecord,
          error: ''
        });

      case 'DELETE':
        if (resultFoundApi?.data?.access !== 'delete') {
          throw new Error(`Unsufficient API permission. Current API access: "${resultFoundApi?.data?.access}" `)
        }
        const tmpDel = await likeList?.getDataByID(id);
        if (!tmpDel) {
          throw new Error('Record not found');
        }
        const retValDelete = await tmpDel.delete();
        if (!retValDelete) {
          throw new Error('Failed to delete record');
        }
        return resolution.json({
          success: true,
          error: ''
        });

      default: throw new Error('Unknown request method');
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
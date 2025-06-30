import { DbConn } from "./configDB.js";
import { ApiKeys } from "../../ApiKeyManagement/Model/ApiKey.js";
import ErrorTemplate from "./ErrorTemplate.js";
import { appConfig } from "../../../../util/config.js";

const requireAdminLogin = (request, response) => {
  if (!request.session?.admin) {
    return response.redirect(302, `${appConfig().SERVER}/admin/login`);
  }
  return null;
};

const Controller = async (request = null, resolution = null) => {
  try {
    const checkLogin = requireAdminLogin(request, resolution);
    if(checkLogin !== null){
      return checkLogin;
    }
    const method = request?.method ?? 'POST';
    const params = request?.params ?? {};
    const body = request?.body ?? {};
    if (!method || method !== 'POST') {
      throw new Error('Unknown request method');
    }
    if (!resolution) {
      throw new Error('Resolution instance not found');
    }

    const dbConn = await DbConn();

    if (dbConn?.error !== '') {
      throw new Error(`Database Connection Error: An error occurred while connecting to the database.
            Please contact your local administrator as soon as possible.`);
    }
    
    await dbConn.module.connect();
    if (dbConn.module.getErrors().length > 0) {
      throw new Error('Database Connection Error: Server could not establish connection with the database. Please contact your local administrator as soon as possible');
    }

    const updateType = params?.type || null;
    const dataHandle = params?.handle || null;
    if (!updateType || (updateType === 'delete' && !dataHandle)) {

      throw new Error('Missing crucial params. Aborting operation');
    }

    const apiKeys = new ApiKeys(dbConn.module);
    await apiKeys.init();

    switch (updateType) {
      case 'create':
        const result = await apiKeys?.GenerateApiKey(body);
        if (result === false) {
          throw new Error('Failed to create new api key');
        }
        resolution.redirect(302, `${appConfig().SERVER}/api/keys`);
        break;
      case 'toggleActive':
        await apiKeys?.toggleActive(dataHandle);
        resolution.redirect(302, `${appConfig().SERVER}/api/keys`);
        break;
      case 'delete':
        await apiKeys?.deleteApi(dataHandle);
        resolution.redirect(302, `${appConfig().SERVER}/api/keys`);
        break;
      default: throw new Error('Unknown update type');
    }

  } catch (error) {
    try {
      const errorTemplate = await ErrorTemplate(error);
      let view = '';
      if (!errorTemplate?.module?.view) {
        throw new Error('Failed to display Error Module Page. Module contains errors or is not active');
      }
      if (resolution) {
        resolution.send(errorTemplate?.module?.view)
      } else {
        view = `<h3 style="text-align:center;color:red">
                Error handling GET Request for  "RestAPI/KeyUpdate" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };
    } catch (error) {
      let view = '';
      if (resolution) {
        resolution?.send(`<h3 style="text-align:center;color:red">
                Error handling GET Request for  "RestAPI/KeyUpdate" module. Please contact your local administrator or review logs
                </h3>`);
      }
      else {
        view = `<h3 style="text-align:center;color:red">
                Error handling GET Request for  "RestAPI/KeyUpdate" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };

    }
  }
};
export default Controller;
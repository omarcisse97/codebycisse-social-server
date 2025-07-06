import InitModulesModel from "./InitModules.js";
import PageFactory from "./PageFactory.js";
import ErrorTemplate from "./ErrorTemplate.js";
import { appConfig } from "../../../util/config.js";

const requireAdminLogin = (request, response) => {
  if (!request.session?.admin) {
    return response.redirect(302,`${appConfig().SERVER}/admin/login`);
  }
  return null;
};


const Controller = async (request = null, resolution = null, dbConn = null,  appGlobal = null) => {
  try {
    const checkLogin = requireAdminLogin(request, resolution);
    if(checkLogin !== null){
      return checkLogin;
    }
    const method = request?.method ?? 'GET';
    if (method !== 'GET') {
      throw new Error('Request method does not match module');
    }

    const modules = await InitModulesModel();
    const pageFactory = await PageFactory();


    if (!modules) {
      throw new Error('We could not initialize modules for display. Please refer to the logs and fix all issues at server level');
    }
    if (!pageFactory) {
      throw new Error('Page Factory could not load template. For more details, check the server logs');
    }

    pageFactory.module.setTitle('Modules List');
    pageFactory.module.setHeader(null, {...request.session.admin});
    pageFactory.module.setFooter();
    pageFactory.module.addContent(`
        <div class="container my-4">
          <h2 class="mb-3">Main Menu</h2>
          <div class="list-group">
        `);

    for (let moduleName in modules) {
      pageFactory.module.addContent(`
                <a href="${appConfig().SERVER}/${modules[moduleName].getRoute()}" 
                   class="list-group-item list-group-item-action">
                  ${moduleName}
                </a>
              `);
    }

    pageFactory.module.addContent(`
            </div>
          </div>
        `);
    pageFactory.module.save();
    resolution.send(pageFactory.module.getTemplate());

  } catch (error) {
      try {
        console.error('Failed GET Request. Error(s): ', error);
        const errorTemplate = await ErrorTemplate(error);
        let view = '';
        if (!errorTemplate?.module?.view) {
          throw new Error('Failed to display Error Module Page. Module contains errors or is not active');
        }
        if (resolution) {
          resolution.send(errorTemplate?.module?.view)
        } else {
          view = `<h3 style="text-align:center;color:red">
              Error handling GET Request for  "DatabaseManagement/List" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
        }
        return { success: false, error: error, view: view };
      } catch (error) {
        let view = '';
        if (resolution) {
          resolution?.send(`<h3 style="text-align:center;color:red">
              Error handling GET Request for  "DatabaseManagement/List" module. Please contact your local administrator or review logs
              </h3>`);
        } 
        else {
          view = `<h3 style="text-align:center;color:red">
              Error handling GET Request for  "DatabaseManagement/List" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
        }
        return { success: false, error: error, view: view };
  
      }
    }
};



export default Controller;

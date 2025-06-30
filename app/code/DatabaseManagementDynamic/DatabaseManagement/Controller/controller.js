import { DbConn } from "./configDB.js";
import { SQLData } from "../Model/model.js";
import PageFactory from "./PageFactory.js";
import { ErrorTemplate } from "./ErrorTemplate.js";
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
        const method = request?.method ?? 'GET';
        const params = request?.params ?? {};
        const body = request?.body ?? {};
        if (method !== 'GET') {
            throw new Error('Request method does not match module');
        }

        const dbConn = await DbConn();
        const pageFactory = await PageFactory();
        if (dbConn?.error !== '') {
            throw new Error(`Database Connection Error: An error occurred while connecting to the database.
            Please contact your local administrator as soon as possible.`);
        }
        
        if (!pageFactory?.module) {
            throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
        }

        await dbConn.module.connect();
        if (dbConn.module.getErrors().length > 0) {
            throw new Error('Database Connection Error: Server could not establish connection with the database. Please contact your local administrator as soon as possible');
        }
        
        const database = new SQLData(dbConn.module);
        await database.init();
        pageFactory.module.setTitle('Database Management');
        const subNavigation = [{ url: `${appConfig().SERVER}/database-management`, title: 'Database Management', active: 'active' }]
        pageFactory.module.setHeader(subNavigation, {...request.session.admin});
        pageFactory.module.setFooter();
        pageFactory.module.addContent(`
                            <div class="container my-4">
                            <h2 class="mb-3">Database</h2>
                            <div class="list-group">
                            `);

        for (let table in database?.getStorage()?.data) {
            pageFactory.module.addContent(`
                            <a href="${appConfig().SERVER}/database-management/${table}"
                               class="list-group-item list-group-item-action">
                            ${table}
                            </a>`);
        }
        pageFactory.module.addContent(`
                             </div>
                             </div>
                            `);

        pageFactory.module.save();
        dbConn.module.disconnect();
        if (!resolution) {
            throw new Error('Resolution not found. Cannot display page');
        }
        resolution?.send(pageFactory.module.getTemplate());
        return { success: true, error: '', view: '' };
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
                Error handling GET Request for  "DatabaseManagement" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
            }
            return { success: false, error: error, view: view };
        } catch (error) {
            let view = '';
            if (resolution) {
                resolution?.send(`<h3 style="text-align:center;color:red">
                Error handling GET Request for  "DatabaseManagement" module. Please contact your local administrator or review logs
                </h3>`);
            }
            else {
                view = `<h3 style="text-align:center;color:red">
                Error handling GET Request for  "DatabaseManagement" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
            }
            return { success: false, error: error, view: view };

        }
    }
};



export default Controller;

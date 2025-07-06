import { DbConn } from "./configDB.js";
import { SQLData } from "../../DatabaseManagement/Model/model.js";
import PageFactory from "./PageFactory.js";
import ErrorTemplate from "./ErrorTemplate.js";
import { appConfig } from "../../../../util/config.js";

const requireAdminLogin = (request, response) => {
    if (!request.session?.admin) {
        return response.redirect(302, `${appConfig().SERVER}/admin/login`);
    }
    return null;
};

const Controller = async (request = null, resolution = null, dbConn = null, appGlobal = null) => {
    try {
        const checkLogin = requireAdminLogin(request, resolution);
        if (checkLogin !== null) {
            return checkLogin;
        }
        const method = request?.method ?? 'GET';
        const params = request?.params ?? {};
        const body = request?.body ?? {};
        if (method !== 'GET') {
            throw new Error('Request method does not match module');
        }

        const pageFactory = await PageFactory();


        if (!pageFactory?.module) {
            throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
        }

        if (!dbConn) {
            throw new Error('Db connection is crucial for module');
        }
       
        if (dbConn?.getErrors().length > 0 || dbConn?.status !== true) {
            throw new Error(`Database Connection Error: An error occurred while connecting to the database.
            Please contact your local administrator as soon as possible.`);
        }

        const paramTableName = params?.tableName || null;
        const paramPK = params?.handle || null;
        if (!paramTableName || !paramPK) {
            throw new Error('Module not found. View details in the logs.');
        }
        const database = new SQLData(dbConn);
        await database.init();
        await database.sortTableByPrimaryKey(paramTableName);
        const data = await database.getDataByTableNameAndPk(paramTableName, paramPK);
        pageFactory.module.setTitle('Database Management');
        const title = `${paramTableName[0].toUpperCase()}${paramTableName.substring(1, paramTableName.length)}`;
        const subNavigation = [
            {
                url: `${appConfig().SERVER}/database-management`,
                title: 'Database Management',
                active: ''
            },
            {
                url: `${appConfig().SERVER}/database-management/${paramTableName}`,
                title: title,
                active: ''
            },
            {
                url: `${appConfig().SERVER}/database-management/${paramTableName}/details/${paramPK}`,
                title: `View Record ${paramPK}`,
                active: 'active'
            }

        ]
        pageFactory.module.setHeader(subNavigation, { ...request.session.admin });
        pageFactory.module.setFooter();
        pageFactory.module.addContent(`
            <div class="container mt-4">
                <a 
                    class="btn btn-secondary mb-3" 
                    href="${appConfig().SERVER}/database-management/${paramTableName}">
                    &laquo; Back to ${title}</a>
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">Primary Key: ${paramPK}</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                        <a 
                            class="btn btn-outline-warning me-2" 
                            href="${appConfig().SERVER}/database-management/${paramTableName}/edit/${paramPK}">
                            Edit</a>
                        <a 
                            class="btn btn-outline-danger" 
                            href="${appConfig().SERVER}/database-management/${paramTableName}/delete/${paramPK}">
                            Delete</a>
                        </div>
                        <ul class="list-group">
            `);
        for (let dt in data?.data) {
            const row = data?.data?.[dt];
            for (let col in row) {
                pageFactory.module.addContent(`
                <li 
                    class="list-group-item">
                    <strong>${col}:</strong>${row[col]}
                </li>
                `);
            }

        }
        pageFactory.module.addContent(`
                        </ul>
                    </div>
                </div>
            </div>
            `);
        pageFactory.module.save();
        

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
                Error handling GET Request for  "DatabaseManagement/Details" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
            }
            return { success: false, error: error, view: view };
        } catch (error) {
            let view = '';
            if (resolution) {
                resolution?.send(`<h3 style="text-align:center;color:red">
                Error handling GET Request for  "DatabaseManagement/Details" module. Please contact your local administrator or review logs
                </h3>`);
            }
            else {
                view = `<h3 style="text-align:center;color:red">
                Error handling GET Request for  "DatabaseManagement/Details" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
            }
            return { success: false, error: error, view: view };

        }
    }
};
export default Controller;
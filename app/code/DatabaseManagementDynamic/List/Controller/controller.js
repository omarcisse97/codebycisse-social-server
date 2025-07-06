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
  const checkLogin = requireAdminLogin(request, resolution);
  if (checkLogin !== null) {
    return checkLogin;
  }
  try {
    const method = request?.method ?? 'GET';
    const params = request?.params ?? {};
    const body = request?.body ?? {};
    if (method !== 'GET') {
      throw new Error('Request method does not match module');
    }
    if (!dbConn) {
      throw new Error('Db connection is crucial for module');
    }
   
    if (dbConn?.getErrors().length > 0 || dbConn?.status !== true) {
      throw new Error(`Database Connection Error: An error occurred while connecting to the database.
            Please contact your local administrator as soon as possible.`);
    }
    const pageFactory = await PageFactory();


    if (!pageFactory?.module) {
      throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
    }



    const param = params?.tableName || null;
    if (!param) {
      throw new Error('Module not found. View details in the logs.');
    }

    const title = `${param[0]?.toUpperCase()}${param?.substring(1, param?.length)}`
    const subNavigation = [
      { url: `${appConfig().SERVER}/database-management`, title: 'Database Management', active: '' },
      { url: `${appConfig().SERVER}/${param}`, title: title, active: 'active' }
    ]

    const database = new SQLData(dbConn);

    await database?.init();

    await database?.sortTableByPrimaryKey(param);

    const currentTable = database?.getTableByTableName(param)?.data || null;
    if (!currentTable) {
      throw new Error(`We could not find table ${param} table in the database`);
    }


    pageFactory.module.setTitle(title);
    pageFactory.module.setHeader({ ...subNavigation }, { ...request.session.admin });
    pageFactory.module.setFooter();
    pageFactory.module.addContent(`
          <div class="container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">${title}</h1>
      <a href="${appConfig().SERVER}/database-management/${param}/create" class="btn btn-success">
        <i class="bi bi-plus-circle"></i> Create new ${title}
      </a>
    </div>
          `);
    pageFactory.module.addContent(`
          <div class="table-responsive">
      <table class="table table-striped table-hover align-middle">
        <thead class="table-primary">
        <tr>
          `);
    currentTable?.columns?.map((value) => {
      pageFactory.module.addContent(`
            <th>${value}</th>
            `)
    });
    pageFactory.module.addContent(`
          <th colspan="3" class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          `);
    const resultPK = await database?.getTablePrimaryKey(param);
    if (!resultPK?.data) {
      throw new Error(`Could not fetch the primary key for table "${title}". Please update the table and create a primary key`);
    }

    const pk = resultPK?.data;
    for (let idx in currentTable?.rows) {
      let tds = '';
      const row = { ...currentTable?.rows[idx] };
      pageFactory.module.addContent(`<tr>`);
      for (let col in row) {
        tds = `
          ${tds}
          <td>${row[col]}</td>
          `
      }
      pageFactory.module.addContent(`
          ${tds}
          <td>
            <a 
              href="${appConfig().SERVER}/database-management/${param}/details/${currentTable?.rows?.[idx]?.[pk]}" 
              class="btn btn-sm btn-info">
            View
            </a>
          </td>
          <td><a href="${appConfig().SERVER}/database-management/${param}/edit/${currentTable?.rows?.[idx]?.[pk]}" class="btn btn-sm btn-warning">Edit</a></td>
          <td><a href="${appConfig().SERVER}/database-management/${param}/delete/${currentTable?.rows?.[idx]?.[pk]}" class="btn btn-sm btn-danger">Delete</a></td>
          `);
      pageFactory.module.addContent(`</tr>`);

    }
    pageFactory.module.addContent(`
        </tbody>
      </table>
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
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

function formatDateForInput(type, value) {
  if (!value) return '';

  const date = new Date(value);
  if (type === 'date') {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  if (type === 'datetime-local') {
    // Remove seconds + Z (keep YYYY-MM-DDTHH:mm)
    return date.toISOString().slice(0, 16);
  }

  return value;
}

const Controller = async (request = null, resolution = null) => {
  try {
    const checkLogin = requireAdminLogin(request, resolution);
    if (checkLogin !== null) {
      return checkLogin;
    }
    const method = request?.method;
    const params = request?.params ?? {};
    const body = request?.body ?? {};
    if (!method || (method !== 'POST' && method !== 'GET')) {
      throw new Error('Unknown request method');
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

    const paramTableName = params?.tableName || null;
    const paramPK = params?.handle || null;
    if (!paramTableName || !paramPK) {
      throw new Error('Module not found. View details in the logs.');
    }

    const database = new SQLData(dbConn.module);
    await database.init();
    await database.sortTableByPrimaryKey(paramTableName);

    const data = await database.getDataByTableNameAndPk(paramTableName, paramPK);
    const resultPK = await database?.getTablePrimaryKey(paramTableName);

    if (!resultPK?.data) {
      throw new Error(`Could not fetch the primary key for table. Please update the table and create a primary key`);
    }

    const pk = resultPK?.data;

    switch (method) {
      case 'GET':
        const pageFactory = await PageFactory();
        if (!pageFactory?.module) {
          throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
        }
        const title = `${paramTableName[0].toUpperCase()}${paramTableName.substring(1, paramTableName.length)}`
        pageFactory.module.setTitle(`Edit - ${title} : ${paramPK}`);
        const subNavigation = [
          {
            url: `${appConfig().SERVER}/database-management`,
            title: 'Database Management',
            active: ''
          },
          {
            url: `${appConfig().SERVER}/database-management/${paramTableName}`,
            title: `${title}`,
            active: ''
          },
          {
            url: `${appConfig().SERVER}/database-management/${paramTableName}/Details/${paramPK}`,
            title: `View Record ${paramPK}`,
            active: ''
          },
          {
            url: `${appConfig().SERVER}/database-management/${paramTableName}/edit/${paramPK}`,
            title: `Edit Record ${paramPK}`,
            active: 'active'
          }

        ]
        pageFactory.module.setHeader(subNavigation, {...request.session.admin});
        pageFactory.module.setFooter();
        pageFactory.module.addContent(`
              <div class="container mt-4">
                <a class="btn btn-secondary mb-3" href="${appConfig().SERVER}/database-management/${paramTableName}">
                  &laquo; Back to ${title}
                </a>

                <form method="POST" action="${appConfig().SERVER}/database-management/${paramTableName}/edit/${paramPK}">
                  <div class="card">
                    <div class="card-header bg-primary text-white">
                      <h5 class="mb-0">Edit Record - Primary Key: ${paramPK}</h5>
                    </div>

                    <div class="card-body">
            `);
        const columnsDataRaw = await database?.getColumnAndDataType(paramTableName);
        const columnsData = columnsDataRaw?.data;

        for (const obj of columnsData) {
          const col = obj.column_name;
          if (col === pk) continue;

          const type = obj.data_type;
          const value = data?.data?.[0]?.[col] ?? '';
          const isRequired = obj.is_nullable === 'NO' ? 'required' : '';
          const isCheckbox = type === 'boolean';
          const isEnumLike = col === 'access';

          let inputField = '';



          if (isCheckbox) {
            const currentValue = value === true || value === 'true' ? 'true' : 'false';
            inputField = `
            <div class="mb-3">
              <label for="${col}" class="form-label">${col}</label>
              <select class="form-select" id="${col}" name="${col}" ${isRequired}>
                <option value="true" ${currentValue === 'true' ? 'selected' : ''}>True</option>
                <option value="false" ${currentValue === 'false' ? 'selected' : ''}>False</option>
              </select>
            </div>
            `;
          } else if (isEnumLike) {
            inputField = `
            <div class="mb-3">
              <label for="${col}" class="form-label">${col}</label>
              <select class="form-select" id="${col}" name="${col}" ${isRequired}>
                <option value="read" ${value === 'read' ? 'selected' : ''}>Read</option>
                <option value="update" ${value === 'update' ? 'selected' : ''}>Update</option>
                <option value="read-update" ${value === 'read-update' ? 'selected' : ''}>Read + Update</option>
                <option value="delete" ${value === 'delete' ? 'selected' : ''}>Delete</option>
              </select>
            </div>
          `;
          } else {
            const inputType =
              type === 'character varying' || type === 'text'
                ? 'text'
                : type === 'integer' || type === 'bigint' || type === 'smallint'
                  ? 'number'
                  : type === 'numeric' || type === 'real' || type === 'double precision'
                    ? 'number'
                    : type === 'date'
                      ? 'date'
                      : type === 'timestamp without time zone' || type === 'timestamp with time zone'
                        ? 'datetime-local'
                        : 'text';

            inputField = `
            <div class="mb-3">
              <label for="${col}" class="form-label">${col}</label>
              <input 
                type="${inputType}"
                class="form-control"
                id="${col}"
                name="${col}"
                value="${formatDateForInput(inputType, value)}"
                ${isRequired}
              >
            </div>
          `;
          }
          pageFactory.module.addContent(inputField);
        }
        pageFactory.module.addContent(`
                    
                  <div class="d-grid gap-2 d-sm-flex justify-content-sm-end mt-4">
                    <button type="submit" class="btn btn-success">Save Changes</button>
                    <a 
                      class="btn btn-outline-danger" 
                      href="${appConfig().SERVER}/database-management/${paramTableName}/delete/${paramPK}">
                      Delete Record
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </div>
        `);

        pageFactory.module.save();
        dbConn.module.disconnect();
        if (!resolution) {
          throw new Error('Resolution not found. Cannot display page');
        }

        resolution?.send(pageFactory.module.getTemplate());
        return { success: true, error: '', view: '' };

      case 'POST':
        if (!body) {
          throw new Error('No data found in POST request body');
        }
        const resultUpdate = await database?.updateDataByTableNameAndFields(paramTableName, { ...body }, paramPK);
        dbConn.module.disconnect();
        if (resultUpdate) {
          if (!resolution) {
            throw new Error('Resolution not found. Cannot display page');
          }
          resolution?.redirect(302, `${appConfig().SERVER}/database-management/${paramTableName}/details/${paramPK}`);
          return { success: true, error: '', view: '' };
        }
        break;
      default:
        throw new Error('Unknown request method');

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
              Error handling GET Request for  "DatabaseManagement/Edit" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };
    } catch (error) {
      let view = '';
      if (resolution) {
        resolution?.send(`<h3 style="text-align:center;color:red">
              Error handling GET Request for  "DatabaseManagement/Edit" module. Please contact your local administrator or review logs
              </h3>`);
      }
      else {
        view = `<h3 style="text-align:center;color:red">
              Error handling GET Request for  "DatabaseManagement/Edit" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };

    }
  }
};
export default Controller;
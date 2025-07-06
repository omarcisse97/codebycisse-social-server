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
    const method = request?.method;
    const params = request?.params ?? {};
    const body = request?.body ?? {};
    if (!method || (method !== 'POST' && method !== 'GET')) {
      throw new Error('Unknown request method');
    }
    if (!resolution) {
      throw new Error('Resolution not Found');
    }

    if (!dbConn) {
      throw new Error('Db connection is crucial for module');
    }
    
    if (dbConn?.getErrors().length > 0 || dbConn?.status !== true) {
      throw new Error(`Database Connection Error: An error occurred while connecting to the database.
            Please contact your local administrator as soon as possible.`);
    }


    const database = new SQLData(dbConn);
    await database.init();
    const tableName = params?.tableName || null;
    if (!tableName) {
      throw new Error('Table name not found from param');
    }
    const columns = database?.tablesSQL?.[tableName]?.columns;
    const pk = await database.getTablePrimaryKey(tableName);
    if (!columns || columns.length < 1 || !pk?.data) {
      throw new Error('An error occured. Please check the logs. Columns or primary key issue for table');
    }

    const columnsInfoResult = await database.getColumnAndDataType(tableName);
    const columnsInfo = columnsInfoResult?.data;
    if (!columnsInfo || !Array.isArray(columnsInfo) || columnsInfo?.length < 1) {
      throw new Error(`No valid columns for table "${tableName}"`);
    }
    switch (method) {
      case 'GET':
        const pageFactory = await PageFactory();
        if (!pageFactory?.module) {
          throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
        }
        let formInputs = '';
        for (const obj of columnsInfo) {
          if (obj?.column_name !== pk?.data) {
            const isCheckbox = obj?.data_type === 'boolean';
            const isEnumLike = obj?.column_name === 'access'; // or use a smarter ENUM checker later
            const required = obj?.is_nullable === 'NO' ? 'required' : '';

            let inputField = '';

            if (isCheckbox) {
              inputField = `
              <div class="mb-3">
                <label for="${obj?.column_name}" class="form-label">${obj?.column_name}</label>
                <select class="form-select" id="${obj?.column_name}" name="${obj?.column_name}" ${required}>
                  <option value="false" selected>False</option>
                  <option value="true">True</option>
                </select>
              </div>
              `;
            } else if (isEnumLike) {
              inputField = `
              <div class="mb-3">
                <label for="${obj?.column_name}" class="form-label">${obj?.column_name}</label>
                <select class="form-select" id="${obj?.column_name}" name="${obj?.column_name}" ${required}>
                  <option value="read">Read</option>
                  <option value="update">Update</option>
                  <option value="read-update">Read + Update</option>
                  <option value="delete">Delete</option>
                </select>
              </div>
            `;
            } else {
              const inputType =
                obj?.data_type === 'character varying' || obj?.data_type === 'text'
                  ? 'text'
                  : obj?.data_type === 'integer' || obj?.data_type === 'bigint' || obj?.data_type === 'smallint'
                    ? 'number'
                    : obj?.data_type === 'numeric' || obj?.data_type === 'real' || obj?.data_type === 'double precision'
                      ? 'number'
                      : obj?.data_type === 'date'
                        ? 'date'
                        : obj?.data_type === 'timestamp without time zone' || obj?.data_type === 'timestamp with time zone'
                          ? 'datetime-local'
                          : 'text';

              inputField = `
            <div class="mb-3">
              <label for="${obj?.column_name}" class="form-label">${obj?.column_name}</label>
              <input 
                type="${inputType}"
                class="form-control"
                id="${obj?.column_name}"
                name="${obj?.column_name}"
                ${required}>
            </div>
          `;
            }
            formInputs += inputField;
          }
        }
        const title = `${tableName[0].toUpperCase()}${tableName.substring(1, tableName.length)}`;
        pageFactory.module.setTitle(`Create ${title} record`);
        const subNavigation = [
          {
            url: `${appConfig().SERVER}/database-management`,
            title: 'Database Management',
            active: ''
          },
          {
            url: `${appConfig().SERVER}/database-management/${tableName}`,
            title: title,
            active: ''
          },
          {
            url: `${appConfig().SERVER}/database-management/${tableName}/create`,
            title: `Create ${title} Record`,
            active: 'active'
          }

        ]
        pageFactory.module.setHeader(subNavigation, { ...request.session.admin });
        pageFactory.module.setFooter();
        pageFactory.module.addContent(`
      <div class="container mt-4">
        <a class="btn btn-secondary mb-3" href="${appConfig().SERVER}/database-management/${tableName}">
          &laquo; Back to ${title}
        </a>

        <form method="POST" action="${appConfig().SERVER}/database-management/${tableName}/create">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0">Create New Record for ${tableName[0].toUpperCase()}${tableName.substring(1)}</h5>
            </div>

            <div class="card-body">
              <!-- Sample Input Fields: Replace with your actual schema -->
              ${formInputs}
              <button type="submit" class="btn btn-success">Create</button>
              <button type="reset" class="btn btn-outline-secondary ms-2">Reset</button>
            </div>
          </div>
        </form>
      </div>
    `);
        pageFactory.module.save();
        
        if (!resolution) {
          throw new Error('Resolution not found. Cannot display page');
        }
        return resolution?.send(pageFactory.module.getTemplate());

      case 'POST':
        if (!body) {
          throw new Error('No POST body found. Aborting operation');
        }
        const newRecord = await database.createRecord(tableName, body);
        const newRecordPk = newRecord?.data;
        if (newRecordPk && newRecord?.success === true) {
          return resolution?.redirect(302, `${appConfig().SERVER}/database-management/${tableName}/details/${newRecordPk}`);
        } else {
          throw new Error('Failed to obtain new record data');
        }
      default: throw new Error('Unknown request method');
    }

  } catch (error) {
    try {
      const errorTemplate = await ErrorTemplate(error);
      if (!errorTemplate?.module?.view) {
        throw new Error('Failed to display Error Module Page. Module contains errors or is not active');
      }
      if (resolution) {
        return resolution.send(errorTemplate?.module?.view)
      } else {
        view = `<h3 style="text-align:center;color:red">
                  Error handling GET Request for  "DatabaseManagement/Create" module. Please contact your local administrator or review logs 
                  </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };
    } catch (error) {
      let view = '';
      if (resolution) {
        resolution?.send(`<h3 style="text-align:center;color:red">
                  Error handling GET Request for  "DatabaseManagement/Create" module. Please contact your local administrator or review logs
                  </h3>`);
      }
      else {
        view = `<h3 style="text-align:center;color:red">
                  Error handling GET Request for  "DatabaseManagement/Create" module. Please contact your local administrator or review logs 
                  </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };

    }
  }
};
export default Controller;
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

    const paramTableName = params?.tableName || null;
    const paramPK = params?.handle || null;
    if (!paramTableName || !paramPK) {
      throw new Error('Module not found. View details in the logs.');
    }
    const database = new SQLData(dbConn);
    await database.init();
    await database.sortTableByPrimaryKey(paramTableName);
    const data = await database.getDataByTableNameAndPk(paramTableName, paramPK);

    switch (method) {
      case 'GET':
        const pageFactory = await PageFactory();
        if (!pageFactory?.module) {
          throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
        }
        const title = `${paramTableName[0].toUpperCase()}${paramTableName.substring(1, paramTableName.length)}`;
        pageFactory.module.setTitle(`Delete - ${title} : ${paramPK}`);
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
          },
          {
            url: `${appConfig().SERVER}/database-management/${paramTableName}/delete/${paramPK}`,
            title: `Delete ${paramPK}`,
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
                  &laquo; Back to ${title}
                </a>

                <div class="card">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0">Primary Key: ${paramPK}</h5>
              </div>

              <div class="card-body">
                <div class="mb-3">
                <div class="alert alert-warning mt-4" role="alert">
                  <strong>Warning:</strong> Please <a href="${appConfig().SERVER}/database-management/${paramTableName}/details/${paramPK}">review</a> the record and confirm deletion. This action is irreversible.
                </div>
                <button 
                    type="button" 
                    class="btn btn-outline-danger" 
                    data-bs-toggle="modal" 
                    data-bs-target="#deleteConfirmModal">
                    Confirm Delete
                  </button>
                </div>
                
              </div>
            </div>

            `);

        pageFactory.module.addContent(`
              </div>
            </div>
          </div>

          <!-- Delete Confirmation Modal -->
          <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                  <h5 class="modal-title" id="deleteConfirmModalLabel">Confirm Delete</h5>
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body">
                  <p>Are you sure you want to delete this record <strong>${paramPK}</strong> from table <strong>${paramTableName}</strong>? This action cannot be undone.</p>
                </div>

                <div class="modal-footer">
                  <form 
                    method="POST" 
                    action="${appConfig().SERVER}/database-management/${paramTableName}/delete/${paramPK}">
                    <button type="submit" class="btn btn-danger">Yes, Delete</button>
                    <input type="hidden" name="successRedirectURL" value="database-management/${paramTableName}">
                  </form>
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
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
      case 'POST':
        const resultDelete = await database?.deleteRecordByTableNameAndPk(paramTableName, paramPK);
        if (resultDelete) {
          resolution?.redirect(302, `${appConfig().SERVER}/database-management/${paramTableName}`);
          return { success: true, error: '', view: '' };
        }

      default: throw new Error('Unknown request method');
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
                Error handling GET Request for  "DatabaseManagement/Delete" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };
    } catch (error) {
      let view = '';
      if (resolution) {
        resolution?.send(`<h3 style="text-align:center;color:red">
                Error handling GET Request for  "DatabaseManagement/Delete" module. Please contact your local administrator or review logs
                </h3>`);
      }
      else {
        view = `<h3 style="text-align:center;color:red">
                Error handling GET Request for  "DatabaseManagement/Delete" module. Please contact your local administrator or review logs 
                </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };

    }
  }
};
export default Controller;
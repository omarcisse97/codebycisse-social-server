import { DbConn } from "./configDB.js";
import { ApiKeys } from "../Model/ApiKey.js";
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
    const apiKeys = new ApiKeys(dbConn.module);
    await apiKeys.init();
    const apiKeysData = apiKeys.getAllKeys();

    switch (method) {
      case 'GET':
        const pageFactory = await PageFactory();
        if (!pageFactory?.module) {
          throw new Error('Page Factory Error: We could not find or use Page Factory module to create a template');
        }
        pageFactory.module.setTitle('Rest API Keys Management');
        const subNavigation = [{ url: `${appConfig()?.SERVER}/api/keys`, title: 'Api Keys', active: 'active' }];
        pageFactory.module.setHeader(subNavigation, {...request.session.admin});
        pageFactory.module.setFooter();

        pageFactory.module.addContent(`
            <div class="container my-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2>API Keys</h2>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#generateKeyModal">
                        + Generate API Key
                    </button>
                </div>

                <div class="list-group">
        `);

        if (Object.keys(apiKeysData?.data || {}).length === 0) {
          pageFactory.module.addContent(`<p class="text-muted">No API keys found.</p>`);
        } else {
          for (const id in apiKeysData.data) {
            const keyObj = apiKeysData.data[id];
            const keyId = `key-${id}`;
            const { key, created_at, is_active = 'active', label } = keyObj;

            pageFactory.module.addContent(`
                    <div class="list-group-item flex-column align-items-start">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">🔑 ${label}</h5>
                            <small class="text-muted">${new Date(created_at).toLocaleString()}</small>
                        </div>
                        <div class="mb-2">
                            <input type="password" class="form-control" id="${keyId}" value="${key}" readonly>
                        </div>
                       <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
  <div class="d-flex gap-2">
    <button class="btn btn-light border" onclick="toggleVisibility('${keyId}', this)" title="Toggle Visibility">
      <i class="bi bi-eye"></i>
    </button>
    <button class="btn btn-light border" onclick="copyToClipboard('${keyId}')" title="Copy Key">
      <i class="bi bi-clipboard"></i>
    </button>
  </div>

  <!-- Dropdown with Bootstrap Modal triggers -->
<div class="dropdown">
  <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
    Actions
  </button>
  <ul class="dropdown-menu">
    <li>
      <button type="button" class="dropdown-item text-warning" data-bs-toggle="modal" data-bs-target="#setInactiveModal-${id}">
        Set ${is_active === true ? 'Inactive' : 'Active'}
      </button>
    </li>
    <li>
      <button type="button" class="dropdown-item text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal-${id}">
        Delete
      </button>
    </li>
  </ul>
</div>

<!-- Set Inactive Modal -->
<div class="modal fade" id="setInactiveModal-${id}" tabindex="-1" aria-labelledby="setInactiveModalLabel-${id}" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="setInactiveModalLabel-${id}">
          <i class="bi bi-exclamation-triangle text-warning me-2"></i>
          Set API Key Inactive
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to set this API key as ${is_active === true ? 'inactive' : 'active'}?</p>
        <div class="alert alert-warning d-flex align-items-center" role="alert">
          <i class="bi bi-info-circle-fill me-2"></i>
          <div>
            <strong>API Key:</strong> ${label}<br>
            <small class="text-muted">This will prevent the key from being used for API requests.</small>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <form method="POST" action="${appConfig()?.SERVER}/api/keys/update/toggleActive/${id}" class="d-inline">
          <button type="submit" class="btn btn-warning">
            <i class="bi bi-pause-circle me-1"></i>
            Set ${is_active === true ? 'Inactive' : 'Active'}
          </button>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Delete Modal -->
<div class="modal fade" id="deleteModal-${id}" tabindex="-1" aria-labelledby="deleteModalLabel-${id}" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="deleteModalLabel-${id}">
          <i class="bi bi-exclamation-triangle text-danger me-2"></i>
          Delete API Key
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to permanently delete this API key?</p>
        <div class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <strong>API Key:</strong> ${label}<br>
            <small class="text-muted">This action cannot be undone. Any applications using this key will stop working immediately.</small>
          </div>
        </div>
        <div class="alert alert-info mt-3" role="alert">
          <i class="bi bi-info-circle me-2"></i>
          <strong>Type "DELETE" to confirm:</strong>
        </div>
        <form method="POST" action="${appConfig()?.SERVER}/api/keys/update/delete/${id}" id="deleteForm-${id}">
          <div class="input-group">
            <input type="text" class="form-control" placeholder="Type DELETE" pattern="DELETE" title="Must type DELETE exactly" required>
            <button type="submit" class="btn btn-danger">
              <i class="bi bi-trash me-1"></i>
              Delete Permanently
            </button>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      </div>
    </div>
  </div>
</div>
</div>

                    </div>
                `);
          }
        }

        pageFactory.module.addContent(`
    </div>
</div>

<!-- Modal -->
<div class="modal fade" id="generateKeyModal" tabindex="-1" aria-labelledby="generateKeyModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="generateKeyForm" method="POST" action="${appConfig()?.SERVER}/api/keys/update/create/new">
                <div class="modal-header">
                    <h5 class="modal-title" id="generateKeyModalLabel">Generate API Key</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="apiLabel" class="form-label">Label</label>
                        <input type="text" class="form-control" id="apiLabel" name="label" placeholder="e.g. read-api-products">
                    </div>
                    <div class="mb-3">
                        <label for="apiExpiry" class="form-label">Expiration Date</label>
                        <input type="date" class="form-control" id="apiExpiry" name="expires_at">
                    </div>

                    <label class="form-label">Access Level</label>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="access" value="read" id="permRead" required>
                            <label class="form-check-label" for="permRead">Read</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="access" value="update" id="permUpdate">
                            <label class="form-check-label" for="permUpdate">Update</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="access" value="read-update" id="permReadUpdate">
                            <label class="form-check-label" for="permReadUpdate">Read + Update</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="access" value="delete" id="permDelete">
                            <label class="form-check-label" for="permDelete">Delete</label>
                        </div>
                        <div class="mb-3">
  <label for="apiIsActive" class="form-label">Status</label>
  <select class="form-select" id="apiIsActive" name="is_active" required>
    <option value="true" selected>Active</option>
    <option value="false">Inactive</option>
  </select>
</div>
                   
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">Generate Key</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    function toggleVisibility(id, btn) {
        const input = document.getElementById(id);
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerText = 'Hide';
        } else {
            input.type = 'password';
            btn.innerText = 'Show';
        }
    }

    function copyToClipboard(id) {
        const input = document.getElementById(id);
        input.type = 'text'; // briefly show
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand('copy');
        input.type = 'password'; // hide again
        alert('API key copied!');
    }
</script>
`);



        pageFactory.module.save();
        dbConn.module.disconnect();
        if (!resolution) {
          throw new Error('Resolution not found. Cannot display page');
        }
        resolution?.send(pageFactory.module.getTemplate());
        return { success: true, error: '', view: '' };
      case 'POST':
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
              Error handling GET Request for  "RestApi/ApiKeyManagement" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };
    } catch (error) {
      let view = '';
      if (resolution) {
        resolution?.send(`<h3 style="text-align:center;color:red">
              Error handling GET Request for  "RestApi/ApiKeyManagement" module. Please contact your local administrator or review logs
              </h3>`);
      }
      else {
        view = `<h3 style="text-align:center;color:red">
              Error handling GET Request for  "RestApi/ApiKeyManagement" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };

    }
  }
};



export default Controller;

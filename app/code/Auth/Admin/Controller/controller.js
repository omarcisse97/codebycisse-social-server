import PageFactory from "./PageFactory.js";
import ErrorTemplate from "./ErrorTemplate.js";
import { appConfig } from "../../../../util/config.js";
import { DbConn } from "./configDB.js";
import { Admins } from "../Model/model.js";


const Controller = async (request = null, resolution = null) => {
  try {
    const method = request?.method;
    const body = request?.body;
    const params = request?.params
    if (method !== 'GET' && method !== 'POST') {
      throw new Error('Request method does not match module');
    }
    if (!resolution) {
      throw new Error('Failed to find response instance');
    }
    if (!params?.handle) {
      throw new Error('Missing crucial params');
    }
    if (request.session?.admin && params?.handle === 'login') {
      return resolution.redirect(302, `${appConfig().SERVER}/`);
    }
    if (!request.session?.admin && params?.handle === 'logout') {
      return resolution.redirect(302, `${appConfig().SERVER}/admin/login`);
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
    const admins = new Admins(dbConn.module);
    await admins.init();
    switch (method) {
      case 'GET':
        if (params?.handle === 'login') {
          const pageFactory = await PageFactory();
          if (!pageFactory) {
            throw new Error('Page Factory could not load template. For more details, check the server logs');
          }
          pageFactory.module.setTitle('Admin login');
          pageFactory.module.setLoginHeader();
          pageFactory.module.setFooter();
          pageFactory.module.addContent(`
                <div class="container d-flex justify-content-center align-items-center" style="height: 70vh;">
                  <div class="card shadow-lg p-4" style="width: 100%; max-width: 400px;">
                    <h2 class="text-center mb-4 text-primary">Admin Login</h2>
                    <form action="${appConfig().SERVER}/admin/login" method="POST">
                      <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input 
                          type="email" 
                          class="form-control" 
                          id="email" 
                          name="email" 
                          placeholder="Enter admin email" 
                          required
                        >
                      </div>
                      <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input 
                          type="password" 
                          class="form-control" 
                          id="password" 
                          name="password" 
                          placeholder="Enter your password" 
                          required
                        >
                      </div>
                      <div class="d-grid">
                        <button type="submit" class="btn btn-primary">
                          <i class="bi bi-box-arrow-in-right me-1"></i> Login
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              `);


          pageFactory.module.save();
          return resolution.send(pageFactory.module.getTemplate());
        }
        if (params?.handle === 'logout') {
          return new Promise((resolve) => {
            request.session.destroy((err) => {
              if (err) {
                console.error('Failed to destroy session:', err);
                resolution.send('<h3 style="text-align:center;color:red">Logout failed. Please try again.</h3>');
                resolve({ success: false, error: 'Session destruction failed' });
              } else {
                resolution.redirect(302, `${appConfig().SERVER}/admin/login`);
                resolve({ success: true, error: '' });
              }
            });
          });

        }
        throw new Error('Unrecognized GET Request');

      case 'POST':
        if (params?.handle === 'login') {
          if (!body || !body?.email || !body?.password) {
            throw new Error('No data found in POST body');
          }
          const myAdmin = admins.getByEmail(body?.email);
          let errors = '';
          if (!myAdmin || !myAdmin.verify(body?.password)) {
            errors = '<p style="color: red;text-align: center;">Invalid Email or Password</p>';
          }
          if (errors !== '') {
            const pageFactory = await PageFactory();
            if (!pageFactory) {
              throw new Error('Page Factory could not load template. For more details, check the server logs');
            }
            pageFactory.module.setTitle('Admin login');
            pageFactory.module.setLoginHeader();
            pageFactory.module.setFooter();
            pageFactory.module.addContent(`
                <div class="container d-flex justify-content-center align-items-center" style="height: 70vh;">
                  <div class="card shadow-lg p-4" style="width: 100%; max-width: 400px;">
                    <h2 class="text-center mb-4 text-primary">Admin Login</h2>
                    <form action="${appConfig().SERVER}/admin/login" method="POST">
                      ${errors}
                      <div class="mb-3">
                        <label for="email" class="form-label">Email</label>
                        <input 
                          type="email" 
                          class="form-control" 
                          id="email" 
                          name="email" 
                          placeholder="Enter admin email" 
                          required
                        >
                      </div>
                      <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input 
                          type="password" 
                          class="form-control" 
                          id="password" 
                          name="password" 
                          placeholder="Enter your password" 
                          required
                        >
                      </div>
                      <div class="d-grid">
                        <button type="submit" class="btn btn-primary">
                          <i class="bi bi-box-arrow-in-right me-1"></i> Login
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              `);


            pageFactory.module.save();
            return resolution.send(pageFactory.module.getTemplate());
          }
          // After successful login (POST):
          request.session.admin = {
            id: myAdmin._id,
            email: myAdmin._email,
            username: myAdmin._username
          };

          return resolution.redirect(302, `${appConfig().SERVER}/`);
        }
        throw new Error('Unknown POST request');
      default: throw new Error('Request method does not match module');
    }


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
              Error handling GET Request for  "Auth/Admin" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };
    } catch (error) {
      let view = '';
      if (resolution) {
        resolution?.send(`<h3 style="text-align:center;color:red">
              Error handling GET Request for  "Auth/Admin" module. Please contact your local administrator or review logs
              </h3>`);
      }
      else {
        view = `<h3 style="text-align:center;color:red">
              Error handling GET Request for  "Auth/Admin" module. Please contact your local administrator or review logs 
              </h3> <br> <p style="text-align:center;color:red">Error(s): ${error}</p>`;
      }
      return { success: false, error: error, view: view };

    }
  }
};



export default Controller;

import { appConfig } from "../../../../util/config.js";
export class PageFactory {
  constructor() {
    this.title = 'Blank';
    this.header = '';
    this.content = '';
    this.footer = '';
    this.page = '';
  }

  setTitle(title) {
    this.title = title;
  }
  setLoginHeader() {
    this.header = `
                    <!DOCTYPE html> 
            <html lang="en"> 
            <head> 
              <meta charset="UTF-8"> 
              <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
              <title>DBMS - ${this.title}</title> 

              <!-- Bootstrap 5 CSS -->
              <link 
                href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" 
                rel="stylesheet"
              >
              <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

              <style>
              html, body {
              height: 100%;
              margin: 0;
              display: flex;
              flex-direction: column;
            }

            #content {
              flex: 1;
            }
              </style>
            </head> 
            <body class="bg-light">

              <!-- Header -->
              <!-- Header -->
            <header class="bg-primary text-white py-4 shadow-sm mb-3">
              <div class="container d-flex justify-content-between align-items-center">
                <h1 class="h4 mb-0">Server</h1>
              </div>
            </header>


             <div id="content">
        `;
  }
  setHeader(subNavigation = null, user = null) {
    let subItems = '';
    if (subNavigation !== null) {
      for (let idx in subNavigation) {
        const nav = subNavigation[idx];
        if (nav?.title && nav?.url) {
          subItems = `
          ${subItems}
          <li class="nav-item">
            <a class="nav-link ${nav?.active}" href="${nav?.url}">${nav?.title}</a>
          </li>
          `
        }

      }
    }
    this.header = `
        <!DOCTYPE html> 
<html lang="en"> 
<head> 
  <meta charset="UTF-8"> 
  <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
  <title>DBMS - ${this.title}</title> 

  <!-- Bootstrap 5 CSS -->
  <link 
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" 
    rel="stylesheet"
  >
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

  <style>
  html, body {
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
}

#content {
  flex: 1;
}
  </style>
</head> 
<body class="bg-light">

  <!-- Header -->
  <!-- Header -->
<header class="bg-primary text-white py-4 shadow-sm mb-3">
  <div class="container d-flex justify-content-between align-items-center">
    <h1 class="h4 mb-0">${appConfig().NAME} ${appConfig().VERSION}</h1>
    ${user? `<span class="d-none d-md-inline">Welcome, <strong>${user?.username}</strong> 👋</span>`: ''}
  </div>
</header>

<!-- Navigation -->
<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
  <div class="container">
    <a class="navbar-brand fw-bold text-primary" href="/">${appConfig().NAME}</a>

    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="navbarNavDropdown">
      <ul class="navbar-nav me-auto">
        <li class="nav-item">
          <a class="nav-link ${subNavigation === null ? 'active' : ''}" href="${appConfig().SERVER}/modules">📁 Modules</a>
        </li>
        ${subItems}
        
      </ul>

      <!-- User Dropdown -->
      ${
        user? `<ul class="navbar-nav">
        <li class="nav-item dropdown">
          <a 
            class="nav-link dropdown-toggle d-flex align-items-center gap-1" 
            href="#" 
            id="userDropdown" 
            role="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false">
            <img src="https://ui-avatars.com/api/?name=${user?.username}&background=0D8ABC&color=fff&size=32" 
                 class="rounded-circle" alt="User Avatar" width="32" height="32">
            <span>${user?.username}</span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
            <li><a class="dropdown-item" href="#">Profile</a></li>
            <li><a class="dropdown-item" href="#">Settings</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="${appConfig().SERVER}/admin/logout">Logout</a></li>
          </ul>
        </li>
      </ul>` : `Not Connected`
      }
      
    </div>
  </div>
</nav>

             <div id="content">
        `;
  }


  setFooter() {
    this.footer = `</div> <footer class="bg-dark text-white text-center py-3 mt-5">
  &copy; 2024 <strong><a href="https://tangerine-brioche-2e70c4.netlify.app/" target="_blank" style="text-decoration: none;">CodeByCisse</a></strong>
</footer>  <script 
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js">
  </script> </body> </html>`;
  }

  addContent(newEl) {
    const strContent = this.content + newEl;
    this.content = strContent;
  }
  clearContent() {
    this.content = '';
  }

  save() {
    if (this.header === null) {
      this.setHeader();
    }
    if (this.footer === null) {
      this.setFooter();
    }

    this.page = this.header + this.content + this.footer;
  }


  getTemplate() {
    if (this.page === '') {
      this.save();
    }
    return this.page;
  }
}

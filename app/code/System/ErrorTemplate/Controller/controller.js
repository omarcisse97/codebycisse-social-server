import PageFactory from "./PageFactory.js";

const Controller = async (errors = '') => {
    try {
        const pageFactory = await PageFactory();
        if (!pageFactory) {
            throw new Error('Unable to fetch pageFactory from enabled modules. Module may be not enabled. Please make updates as soon as possible');
        }
        pageFactory.module.setTitle('Oops! An Error Occurred');
        pageFactory.module.setHeader();
        pageFactory.module.setFooter();
        pageFactory.module.addContent(`
                <div class="content d-flex align-items-center justify-content-center vh-100">
                    <div class="text-center">
                        <div class="mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#dc3545" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.89 0 1.438-.99.982-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1-2.002 0 1 1 0 0 1 2.002 0z"/>
                            </svg>
                        </div>
                        <h1 class="display-5 text-danger fw-bold">Oops! Something went wrong.</h1>
                        <p class="lead text-muted mb-4">
                            We hit a little snag. It could be a temporary issue or a server hiccup.<br>
                            Please try again or contact your administrator if the problem persists. <br><br>
                            <strong>Details:</strong>
                            ${errors === ''? 'Refer to console logs': errors}
                        </p>
                        <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
                            <a href="${appConfig().SERVER}/modules" class="btn btn-outline-primary btn-lg px-4">Back to Modules</a>
                            <a href="javascript:location.reload()" class="btn btn-danger btn-lg px-4">Retry</a>
                        </div>
                    </div>
                </div>
            `);
        pageFactory.module.save();
        
        return {
            view: pageFactory.module.getTemplate(),
            error: ''
        }

    } catch (error) {
        return {
            view: `<div class="container my-4">
                    <div class="alert alert-danger text-center" role="alert">
                        <strong>Unable to display error template</strong><br>
                        Please contact your local administrator as soon as possible.
                    </div>
                  </div>`,
            error: error
        }
    }

}
export default Controller;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Registration = () => {
    const registration = {
        _namespace: 'DatabaseManagementDynamic',
        _modules: {
            DataManagementMenu: {
                _moduleName: 'List',
                _modulePath: path.join(__dirname, 'List'),
                _controller: path.join(__dirname, 'List', 'Controller', 'controller.js'),
                _publicRoute: 'database-management/:tableName',
                _displayInModules: "false"
            },
            Details: {
                _moduleName: 'Details',
                _modulePath: path.join(__dirname, 'Details'),
                _controller: path.join(__dirname, 'Details', 'Controller', 'controller.js'),
                _publicRoute: 'database-management/:tableName/details/:handle',
                _displayInModules: "false"
            },
            Edit: {
                _moduleName: 'Edit',
                _modulePath: path.join(__dirname, 'Edit'),
                _controller: path.join(__dirname, 'Edit', 'Controller', 'controller.js'),
                _publicRoute: 'database-management/:tableName/edit/:handle',
                _postRoute: 'database-management/:tableName/edit/:handle',
                _displayInModules: "false"
            },
            Delete: {
                _moduleName: 'Delete',
                _modulePath: path.join(__dirname, 'Delete'),
                _controller: path.join(__dirname, 'Delete', 'Controller', 'controller.js'),
                _publicRoute: 'database-management/:tableName/delete/:handle',
                _postRoute: 'database-management/:tableName/delete/:handle', 
                _displayInModules: "false"
            },
            Create: {
                _moduleName: 'Create',
                _modulePath: path.join(__dirname, 'Create'),
                _controller: path.join(__dirname, 'Create', 'Controller', 'controller.js'),
                _publicRoute: 'database-management/:tableName/create',
                _postRoute: 'database-management/:tableName/create',
                _displayInModules: "false"
            },
            

        }
    }
    registration._modules['DatabaseManagement'] = {
        _moduleName: 'Database Management',
        _modulePath: path.join(__dirname, 'DatabaseManagement'),
        _controller: path.join(__dirname, 'DatabaseManagement', 'Controller', 'controller.js'),
        _publicRoute: 'database-management',
        _displayInModules: "true"

    };

    return registration;
}
export default Registration;
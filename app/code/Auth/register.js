import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Registration = () => {
    return {
        _namespace: 'Auth',
        _modules: {
            Admin: {
                _moduleName: 'Admin',
                _modulePath: path.join(__dirname, 'Admin'),
                _controller: path.join(__dirname, 'Admin', 'Controller', 'controller.js'),
                _publicRoute: 'admin/:handle',
                _postRoute: 'admin/:handle',
                _displayInModules: "false"
            },
            
            
         
        }
    }

}
export default Registration;
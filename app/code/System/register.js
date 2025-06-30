import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Registration = () => {
    return {
        _namespace: 'System',
        _modules: {
           PageFactory: {
                _moduleName: 'PageFactory',
                _modulePath: path.join(__dirname, 'PageFactory'),
                _controller: path.join(__dirname, 'PageFactory', 'Controller', 'controller.js'),
                _publicRoute: '',
            },
            ErrorTemplate: {
                _moduleName: 'ErrorTemplate',
                _modulePath: path.join(__dirname, 'ErrorTemplate'),
                _controller: path.join(__dirname, 'ErrorTemplate', 'Controller', 'controller.js'),
                _publicRoute: '',
            }
            
        }
    }
}
export default Registration;
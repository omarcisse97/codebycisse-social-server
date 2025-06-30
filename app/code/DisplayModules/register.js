import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const Registration = () => {
    return {
        _namespace: 'DisplayModules',
        _modules: {
           DisplayModules: {
                _moduleName: 'DisplayModules',
                _modulePath: path.join(__dirname),
                _controller: path.join(__dirname, 'Controller', 'controller.js'),
                _publicRoute: 'modules',
            }
        }
    }
}
export default Registration;
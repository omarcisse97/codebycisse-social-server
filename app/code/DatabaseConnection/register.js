import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Registration = () => {
    return {
        _namespace: 'DatabaseConnection',
        _modules: {
           Postgres: {
                _moduleName: 'Postgres',
                _modulePath: path.join(__dirname, 'Postgres'),
                _controller: path.join(__dirname, 'Postgres', 'Controller', 'controller.js'),
                _publicRoute: '',
            }
            
        }
    }
}
export default Registration;
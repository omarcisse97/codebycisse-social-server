import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ModuleMetaData = (module = null, schema = null) => {
    try {
        const metadata = {
            users: {
                schema: 'users',
                routes: ['GET', 'POST', 'PUT', 'DELETE'] ,
                module_name: 'users'
            },
            avatars: {
                schema: 'avatars',
                routes: ['GET', 'POST', 'PUT', 'DELETE'] ,
                module_name: 'avatars'
            },
            posts: {
                schema: 'posts',
                routes: ['GET', 'POST', 'PUT', 'DELETE'],
                module_name: 'posts'
            },
            messages: {
                schema: 'messages',
                routes: ['GET', 'POST', 'PUT', 'DELETE'] ,
                module_name: 'messages'
            }
        }
        if (module && !(module.toLowerCase() in metadata)) {
            throw new Error(`Module API "${module}" not found`);
        }
        
        if(schema){
            const schemaSearch = Object.values(metadata).filter(mdl => mdl?.schema === schema.toLowerCase()) ?? null;
            if(schemaSearch.length < 1){
                throw new Error(`Schema "${schema}" not found`);
            }
            if(!module) return schemaSearch;
        }
        return module? {...metadata[module.toLowerCase()]}: metadata;

    } catch (error) {
        console.error('Failed to obtain modules meta data. Error(s): ', error);
    }
}
const Registration = () => {
    return {
        _namespace: 'RestAPI',
        _modules: {
            ApiKeyManagement: {
                _moduleName: 'Api Key Management',
                _modulePath: path.join(__dirname, 'ApiKeyManagement'),
                _controller: path.join(__dirname, 'ApiKeyManagement', 'Controller', 'controller.js'),
                _publicRoute: 'api/keys',
                _displayInModules: "true"
            },
            KeyUpdates: {
                _moduleName: 'KeyUpdates',
                _publicRoute: '',
                _modulePath: path.join(__dirname, 'KeyUpdates'),
                _controller: path.join(__dirname, 'KeyUpdates', 'Controller', 'controller.js'),
                _postRoute: 'api/keys/update/:type/:handle',
                _displayInModules: "false"
            },
            DynamicRequests: {
                _moduleName: 'DynamicRequests',
                _modulePath: path.join(__dirname, 'DynamicRequests'),
                _controller: path.join(__dirname, 'DynamicRequests', 'Controller', 'controller.js'),
                _publicRoute: 'api/:module',
                _postRoute: 'api/:module',
                _putRoute: 'api/:module',
                _deleteRoute: 'api/:module',
                _displayInModules: "false"
            }
        }
    }

}
export default Registration;
import ModuleManager from '../../../../ModuleManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PageFactory = async () => {
    const moduleManager = new ModuleManager();
    await moduleManager.initModules();
    const moduleObj = await moduleManager.getModuleFromNamespace('PageFactory', 'System');
    if(moduleObj.error !== ''){
        return { module: null, error: moduleObj.error};
    }
    const tmpModule = moduleObj.moduleData;
    const tmpModulePath = `file://${(path.resolve(__dirname, tmpModule._controller)).replace(/\\/g, '/')}`;
    try{
        const { default: Controller } = await import(tmpModulePath);
        return {module: await Controller(), error: ''}
    } catch(err){
        console.error(`Unable to use PageFactory module at this moment. error -> ${err}`);
        return {module: null, error: err};
    }
};

export default PageFactory;

import ModuleManager from "../../../../ModuleManager.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DbConn = async() => {
    const moduleManager = new ModuleManager();
    await moduleManager.initModules();
    const dbConfig = await moduleManager.getModuleFromNamespace('Postgres', 'DatabaseConnection');
    if(dbConfig.error !== ''){
        return{
            module: null,
            error: dbConfig.error
        }
    }
    const tmpModule = dbConfig.moduleData;
    const tmpModulePath = `file://${(path.resolve(__dirname, tmpModule._controller)).replace(/\\/g, '/')}`;
    try{
        const { default: DatabaseConnection} = await import(tmpModulePath);
        return {
            module: DatabaseConnection(),
            error: ''
        }
    } catch(err){
        return{
            connection: null,
            error: err
        }
    } 

};
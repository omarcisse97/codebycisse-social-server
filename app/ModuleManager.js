import { ModuleSync, getModulesLog } from "./util/config.js";
 class ModuleManager {
    constructor(){
        this.modules = null;
    }
    async initModules(){
        await ModuleSync();
        this.modules = await getModulesLog();
    }
    async getModules(){
        return this.modules;
    }
    async getNamespace(namespace){
        if(this.modules === null){
            await this.initModules();
        }
        return this.modules[namespace] != null?
            {
                namespaceData: this.modules[namespace],
                error: ''
            } : 
            {
                namespaceData: null,
                error: 'Could not find namespace'
            }
    }
    async getModuleFromNamespace(module, namespace){
        if(this.modules === null){
            await this.initModules();
        }
        return this.modules[namespace] != null?
            this.modules[namespace]._modules[module] != null?
                { moduleData: this.modules[namespace]._modules[module], error: ''}:
                { moduleData: null, error: `Could not find module "${module}" in namespace "${namespace}"`}
            : 
            { moduleData: null, error: 'Could not find namespace'}
    }
};
export default ModuleManager;
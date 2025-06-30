import ModuleManager from "../../../ModuleManager.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

class Modules{
    constructor(name = '', route = '', modulePath = '' ){
        this.name = name;
        this.route = route;
        this.modulePath = modulePath;
        
    }
    getName(){
        return this.name;
    }
    setName(name){
        this.name = name;
    }
    getRoute(){
        return this.route;
    }
    setRoute(route){
        this.route = route;
    }
    getModulePath(){
        return this.modulePath;
    }
    setModulePath(modulePath){
        this.modulePath = modulePath;
    }
    
}
const createModules = () => {

}
export default Modules;
import { PSQL } from '../Model/model.js';
import { appConfig } from '../../../../util/config.js';

const Controller = () => {
    const dbConn = new PSQL();
    dbConn.createConnection(appConfig().DATABASES?.PSQL);
    return dbConn;
};
export default Controller;
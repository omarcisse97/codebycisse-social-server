import { PSQL } from '../Model/model.js';
import { appConfig } from '../../../../util/config.js';

const Controller = (mode = 'client') => {
    const dbConn = new PSQL(mode);
    dbConn.createConnection(appConfig().DATABASES?.PSQL);
    return dbConn;
};
export default Controller;
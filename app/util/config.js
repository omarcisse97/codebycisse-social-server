import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';


// Define __dirname using import.meta.url workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registryFilePath = path.join(__dirname, 'registry.json');

// Ensure `registry.json` exists
if (!fs.existsSync(registryFilePath)) {
    fs.writeFileSync(registryFilePath, JSON.stringify({}), 'utf-8');
}

// Utility to read and parse the registry JSON file (asynchronously)
export const getModulesLog = async () => {
    try {
        const data = await fs.promises.readFile(registryFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading registry.json:', err);
        return {}; // Return an empty object if the file doesn't exist or can't be read
    }
};

// Utility to save updated registry to file
export const saveModuleLog = async (modulesList) => {
    try {
        await fs.promises.writeFile(registryFilePath, JSON.stringify(modulesList, null, 2));
        console.log('Registry updated.');
    } catch (err) {
        console.error('Error writing to registry.json:', err);
    }
};

export const ModuleSync = async () => {
    const basePath = path.join(__dirname, '../code');
    let matchedFiles = [];

    // Recursive function to search for registration.js files
    const findFiles = (dir) => {
        try {
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                const fullPath = path.join(dir, file);
                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    findFiles(fullPath);
                } else if (file === 'register.js') {
                    matchedFiles.push(`file://${fullPath.replace(/\\/g, '/')}`);
                }
            });
        } catch (err) {
            console.error(`Error reading directory ${dir}:`, err);
        }
    };

    findFiles(basePath);

    if (matchedFiles.length > 0) {
        let moduleLog = await getModulesLog();

        for (let i in matchedFiles) {

            const tempStr = matchedFiles[i].replace(`file://${basePath.replace(/\\/g, '/')}`, '');

            const tempArr = tempStr.split('/');
            const moduleName = tempArr[1];

            try {
                const { default: Registration } = await import(matchedFiles[i]);
                const tempModule = Registration();

                moduleLog[moduleName] = tempModule;

            } catch (err) {
                console.error(`Could not load the module from ${matchedFiles[i]}:`, err);
            }
        }

        await saveModuleLog(moduleLog);
    } else {
        console.log('No registration.js files found.');
    }
};
/**
 * 
 * DB_USER=suppliers_parts_db_admin
DB_HOST=localhost
DB_DATABASE=suppliers_parts_db
DB_PASSWORD=pass
DB_PORT=5432
 */
export const appConfig = () => {
    dotenv.config();
    return {
        SERVER: process.env.SERVER,
        DATABASES: {
            PSQL: process.env.POSTGRES,
            DEFAULT: process.env.DEFAULT_DB
        },
        SECRET: process.env.ADMIN_SECRET,
        VERSION: process.env.APP_VERSION,
        NAME: process.env.APP_NAME
    }
}

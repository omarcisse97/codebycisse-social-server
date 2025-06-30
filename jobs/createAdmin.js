import  PSQL  from "../app/code/DatabaseConnection/Postgres/Controller/controller.js";
import bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
const argMap = {};
args.forEach((arg, i) => {
  if (arg.startsWith('-')) {
    argMap[arg.replace(/^-+/, '')] = args[i + 1];
  }
});

const email = argMap.u;
const password = argMap.p;
const username = email?.split('@')[0];
const isActive = argMap.a === 'true' || argMap.a === '1';

const createAdmin = async (_dbConnection, _email, _password, _username, _isActive) => {
  try {
    await _dbConnection.connect();
    if (_dbConnection.status !== true) {
      throw new Error('Failed to establish database connection');
    }

    const result = await _dbConnection.client.query(`
      INSERT INTO admins(email, password, username, is_active)
      VALUES ($1, $2, $3, $4) RETURNING *;
    `, [_email, _password, _username, _isActive]);

    await _dbConnection.disconnect();

    if (!result?.rows?.[0]) {
      throw new Error('PSQL insert returned empty');
    }

    console.log(`✅ Admin "${_email}" successfully created.`);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

(async () => {
  try {
    if (!email || !password) {
      throw new Error('Missing required parameters: -u (email), -p (password)');
    }

    console.log('👷 Creating admin...');
    const dbConnection = PSQL();
    const hashedPassword = bcrypt.hashSync(password, 10);
    await createAdmin(dbConnection, email, hashedPassword, username, isActive);
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message);
    process.exit(1);
  }
})();

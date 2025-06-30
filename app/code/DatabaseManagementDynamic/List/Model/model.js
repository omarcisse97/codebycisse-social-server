export const getAllDataFromTable = async (dbConn, tableName, columnSort) => {
  try {
    const allowedTables = ['suppliers', 'jobs', 'shipments', 'parts', 'users'];
    const allowedColumns = ['pnum', 'snum', 'jnum'];

    if (allowedTables.includes(tableName) && allowedColumns.includes(columnSort)) {
      const data = await dbConn.fetch(`SELECT * FROM ${tableName} ORDER BY ${columnSort} ASC`);
      return data;
    }

    throw new Error(`Table "${tableName}" or column "${columnSort}" is not allowed or does not exist.`);
  } catch (err) {
    console.error('Error occurred');
    console.error(err);
    return { data: null, error: err };
  }
};

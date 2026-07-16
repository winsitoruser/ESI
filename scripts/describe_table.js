const { Sequelize } = require('sequelize');
const cfg = require('../config/database.js').development;

const tableName = process.argv[2] || 'customer_loyalty';

(async () => {
  const sequelize = new Sequelize(cfg.database, cfg.username, cfg.password, {
    host: cfg.host,
    port: cfg.port,
    dialect: cfg.dialect,
    logging: false,
  });

  try {
    const sql = `SELECT column_name,data_type FROM information_schema.columns WHERE table_name='${tableName}' ORDER BY ordinal_position;`;
    const [rows] = await sequelize.query(sql);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e);
  } finally {
    await sequelize.close();
  }
})();

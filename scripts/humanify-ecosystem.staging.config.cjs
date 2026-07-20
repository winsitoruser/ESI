/** PM2 ecosystem — Humanify staging slot (port 3021, separate from prod). */
process.env.HUMANIFY_PM2_NAME = 'humanify-staging';
process.env.HUMANIFY_PORT = '3021';
module.exports = require('./humanify-ecosystem.config.cjs');

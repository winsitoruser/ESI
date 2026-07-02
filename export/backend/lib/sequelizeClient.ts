import db from '../models';

// File ini menyediakan cara yang konsisten untuk mengakses instance Sequelize di seluruh aplikasi
// Menggantikan lib/prisma.ts dan lib/prismaClient.ts

const sequelize = db.sequelize;

export { db, sequelize };
export default db;

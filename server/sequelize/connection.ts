/**
 * Sequelize Connection
 * Re-exports sequelize instance from lib/db
 */

import sequelize from '@/lib/db';

export function getSequelize() {
  return sequelize;
}

export { sequelize };
export default sequelize;

const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: false
  }
);

async function seedRecipeIngredients() {
  try {
    console.log('Seeding recipe ingredients...');
    
    // Get recipes
    const recipes = await sequelize.query('SELECT id, code FROM recipes ORDER BY id');
    
    // Recipe 1 - Nasi Goreng
    await sequelize.query(`
      INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, unit_cost, subtotal_cost, sort_order)
      VALUES 
        (1, 1, 300, 'gram', 10, 3000, 0),
        (1, 2, 100, 'gram', 50, 5000, 1),
        (1, 3, 1, 'butir', 2000, 2000, 2),
        (1, 4, 3, 'siung', 166.67, 500, 3),
        (1, 5, 2, 'sdm', 750, 1500, 4)
      ON CONFLICT DO NOTHING
    `);

    // Recipe 2 - Soto Ayam
    await sequelize.query(`
      INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, unit_cost, subtotal_cost, sort_order)
      VALUES 
        (2, 6, 200, 'gram', 40, 8000, 0),
        (2, 7, 2, 'cm', 250, 500, 1),
        (2, 8, 1, 'batang', 300, 300, 2),
        (2, 9, 3, 'lembar', 66.67, 200, 3),
        (2, 10, 50, 'gram', 40, 2000, 4)
      ON CONFLICT DO NOTHING
    `);

    // Recipe 3 - Ayam Bakar Madu
    await sequelize.query(`
      INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, unit_cost, subtotal_cost, sort_order)
      VALUES 
        (3, 11, 300, 'gram', 40, 12000, 0),
        (3, 12, 3, 'sdm', 1000, 3000, 1),
        (3, 13, 2, 'sdm', 500, 1000, 2),
        (3, 14, 5, 'siung', 200, 1000, 3),
        (3, 15, 3, 'buah', 333.33, 1000, 4)
      ON CONFLICT DO NOTHING
    `);

    // Update recipe costs
    await sequelize.query(`
      UPDATE recipes 
      SET total_cost = (
        SELECT COALESCE(SUM(subtotal_cost), 0) 
        FROM recipe_ingredients 
        WHERE recipe_id = recipes.id
      )
    `);

    console.log('✅ Recipe ingredients seeded successfully');
  } catch (error) {
    console.error('Error seeding recipe ingredients:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

seedRecipeIngredients();

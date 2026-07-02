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

async function createRecipesTables() {
  try {
    console.log('Creating recipes table...');
    
    // Create recipes table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        batch_size DECIMAL(10, 2) NOT NULL DEFAULT 1,
        batch_unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
        estimated_yield DECIMAL(10, 2),
        yield_percentage DECIMAL(5, 2) DEFAULT 100,
        preparation_time_minutes INTEGER DEFAULT 0,
        cooking_time_minutes INTEGER DEFAULT 0,
        total_time_minutes INTEGER DEFAULT 0,
        total_cost DECIMAL(15, 2) DEFAULT 0,
        labor_cost DECIMAL(15, 2) DEFAULT 0,
        overhead_cost DECIMAL(15, 2) DEFAULT 0,
        total_production_cost DECIMAL(15, 2) DEFAULT 0,
        cost_per_unit DECIMAL(15, 2) DEFAULT 0,
        difficulty_level VARCHAR(10) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
        category VARCHAR(100),
        status VARCHAR(10) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
        version INTEGER DEFAULT 1,
        instructions TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ Recipes table created');

    // Create recipe_ingredients table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        unit_cost DECIMAL(15, 2) DEFAULT 0,
        subtotal_cost DECIMAL(15, 2) DEFAULT 0,
        is_optional BOOLEAN DEFAULT false,
        preparation_notes TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('✅ Recipe ingredients table created');

    // Create indexes
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_recipes_code ON recipes(code)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by)');
    
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON recipe_ingredients(product_id)');

    console.log('✅ Indexes created');

    // Insert sample data
    const { v4: uuidv4 } = require('uuid');
    
    // Get a sample user
    const [userResult] = await sequelize.query(`
      SELECT id FROM users WHERE email = 'winsitoruser@gmail.com' LIMIT 1
    `);
    
    const userId = userResult[0]?.id;

    // Insert sample recipes
    await sequelize.query(`
      INSERT INTO recipes (code, name, description, category, preparation_time_minutes, cooking_time_minutes, total_time_minutes, difficulty_level, total_cost, batch_size, batch_unit, instructions, created_by)
      VALUES 
        ('REC-1', 'Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, dan sayuran', 'Main Course', 10, 15, 25, 'easy', 12000, 1, 'porsi', 'Panaskan minyak dalam wajan
Tumis bawang merah hingga harum
Masukkan ayam, masak hingga matang
Masukkan nasi, aduk rata
Tambahkan kecap dan bumbu
Buat lubang di tengah, masukkan telur
Aduk semua bahan hingga tercampur rata
Sajikan dengan kerupuk dan acar', :userId),
        ('REC-2', 'Soto Ayam', 'Soto ayam kuning dengan kuah gurih', 'Soup', 20, 45, 65, 'medium', 15000, 1, 'porsi', 'Rebus ayam dengan bumbu halus
Angkat ayam, suwir-suwir
Saring kaldu
Siapkan mangkuk saji
Masukkan soun, tauge, ayam
Tuang kuah panas
Beri pelengkap: bawang goreng, seledri, jeruk nipis', :userId),
        ('REC-3', 'Ayam Bakar Madu', 'Ayam bakar dengan saus madu pedas manis', 'Main Course', 30, 40, 70, 'medium', 18000, 1, 'porsi', 'Marinasi ayam dengan bumbu halus selama 30 menit
Bakar ayam di atas bara api
Olesi dengan saus madu secara berkala
Bakar hingga matang dan kecoklatan
Sajikan dengan nasi hangat dan lalapan', :userId)
      ON CONFLICT (code) DO NOTHING
    `, {
      replacements: { userId }
    });

    console.log('✅ Sample recipes inserted');

    // Get recipe IDs and insert ingredients
    const recipes = await sequelize.query('SELECT id, code FROM recipes ORDER BY id');
    
    for (const recipe of recipes[0]) {
      if (recipe.code === 'REC-1') {
        await sequelize.query(`
          INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, unit_cost, subtotal_cost, sort_order)
          VALUES 
            (:recipeId, 1, 300, 'gram', 10, 3000, 0),
            (:recipeId, 2, 100, 'gram', 50, 5000, 1),
            (:recipeId, 3, 1, 'butir', 2000, 2000, 2),
            (:recipeId, 4, 3, 'siung', 166.67, 500, 3),
            (:recipeId, 5, 2, 'sdm', 750, 1500, 4)
          ON CONFLICT DO NOTHING
        `, { replacements: { recipeId: recipe.id } });
      } else if (recipe.code === 'REC-2') {
        await sequelize.query(`
          INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, unit_cost, subtotal_cost, sort_order)
          VALUES 
            (:recipeId, 6, 200, 'gram', 40, 8000, 0),
            (:recipeId, 7, 2, 'cm', 250, 500, 1),
            (:recipeId, 8, 1, 'batang', 300, 300, 2),
            (:recipeId, 9, 3, 'lembar', 66.67, 200, 3),
            (:recipeId, 10, 50, 'gram', 40, 2000, 4)
          ON CONFLICT DO NOTHING
        `, { replacements: { recipeId: recipe.id } });
      } else if (recipe.code === 'REC-3') {
        await sequelize.query(`
          INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit, unit_cost, subtotal_cost, sort_order)
          VALUES 
            (:recipeId, 11, 300, 'gram', 40, 12000, 0),
            (:recipeId, 12, 3, 'sdm', 1000, 3000, 1),
            (:recipeId, 13, 2, 'sdm', 500, 1000, 2),
            (:recipeId, 14, 5, 'siung', 200, 1000, 3),
            (:recipeId, 15, 3, 'buah', 333.33, 1000, 4)
          ON CONFLICT DO NOTHING
        `, { replacements: { recipeId: recipe.id } });
      }
    }

    console.log('✅ Sample ingredients inserted');
    console.log('\n✅ All done! Recipes tables created successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

createRecipesTables();

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("model: 'users'") || lines[i].includes("model: 'products'")) {
      // look around 10 lines before for Sequelize.UUID
      for (let j = Math.max(0, i - 10); j <= i; j++) {
        if (lines[j].includes('Sequelize.UUID')) {
          lines[j] = lines[j].replace('Sequelize.UUID', 'Sequelize.INTEGER');
          console.log(`Replaced in ${file}:${j + 1}`);
        }
      }
    }
  }
  
  const newContent = lines.join('\n');
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }
});

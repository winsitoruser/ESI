const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('model: \'users\'') || lines[i].includes('model: \'products\'')) {
      // look around 5 lines before for Sequelize.UUID
      let found = false;
      for (let j = Math.max(0, i - 10); j <= i; j++) {
        if (lines[j].includes('Sequelize.UUID')) {
          found = true;
          break;
        }
      }
      
      if (found) {
        console.log(`${file}:${i + 1} -> ${lines[i].trim()}`);
      }
    }
  }
});

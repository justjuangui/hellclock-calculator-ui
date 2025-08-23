import fs from 'fs';
import path from 'path';

const dir = path.resolve('static/assets'); // or wherever your JSONs are

function minifyJsonFiles(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      minifyJsonFiles(fullPath);
    } else if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      fs.writeFileSync(fullPath, JSON.stringify(data));
      console.log(`Minified: ${fullPath}`);
    }
  });
}

minifyJsonFiles(dir);

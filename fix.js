const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
c = c.replace(
  'app.use(helmet',
  'app.set("trust proxy", 1);\napp.use(helmet'
);
fs.writeFileSync('backend/server.js', c);
console.log('Done!');
const fs = require('fs');
let c = fs.readFileSync('backend/config/db.js', 'utf8');
c = c.replace(
  "console.log('MongoDB connected');",
  "console.log('MongoDB connected');\n    await seedAdminIfNeeded();"
);
fs.writeFileSync('backend/config/db.js', c);
console.log('Done!');
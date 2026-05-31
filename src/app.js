'use strict';
require('./env');
const http = require('node:http');
const { router } = require('./router');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // Parse body
  let body = {};
  if (req.method !== 'GET') {
    try {
      const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } }));
      return;
    }
  }

  req.body = body;
  req.url = req.url.split('?')[0]; // strip query string

  const result = await router(req, res);

  res.writeHead(result.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result.body));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n  Interview Scheduling System`);
    console.log(`  Server:  http://localhost:${PORT}`);
    console.log(`  API:     http://localhost:${PORT}/api-docs\n`);
  });
}

module.exports = { server };

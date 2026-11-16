/* Local test server: serves the site's exact rewrites and extensionless pages. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../vercel.json');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

function createSiteServer() {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const rewrite = config.rewrites?.find(rule => rule.source === url.pathname);
      const pathname = decodeURIComponent(url.pathname);
      let file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      if (!path.extname(file)) file += '.html';
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        if (rewrite?.destination.startsWith('/api/')) {
          return require(path.join(root, `${rewrite.destination}.js`))(req, res);
        }
        if (rewrite) {
          const destination = path.join(root, `${rewrite.destination}.html`);
          if (fs.existsSync(destination)) {
            res.setHeader('Content-Type', types['.html']);
            res.end(fs.readFileSync(destination));
            return;
          }
        }
        res.writeHead(404).end(); return;
      }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch (error) {
      res.writeHead(500).end(error.message);
    }
  });
}

module.exports = { createSiteServer };
if (require.main === module) {
  createSiteServer().listen(4173, '127.0.0.1', () => console.log('Site: http://127.0.0.1:4173'));
}

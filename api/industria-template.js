const serveTemplate = require('../lib/seo-template.cjs');

module.exports = (req, res) => serveTemplate(req, res, 'industria-template', 'ind');

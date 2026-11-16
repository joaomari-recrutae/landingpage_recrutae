const serveTemplate = require('../lib/seo-template.cjs');

module.exports = (req, res) => serveTemplate(req, res, 'blog-post', 'post', 'engenharia-da-escolha');

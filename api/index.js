const serverlessExpress = require('vercel-serverless-express');
const app = require('../Proxy/server');
module.exports = serverlessExpress({ app }); 
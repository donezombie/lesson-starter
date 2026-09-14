const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 4100;
// Base URL shown as the Swagger "Servers" dropdown. On deploy, set APP_URL
// (e.g. https://api.example.com) so the docs point at the real host instead
// of localhost. Falls back to the local dev address when unset.
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Study Server API',
      version: '1.0.0',
      description: 'API docs for the study server',
    },
    servers: [
      {
        url: APP_URL,
        description: APP_URL.includes('localhost') ? 'Local server' : 'Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
  },
  // Files containing @swagger JSDoc annotations
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

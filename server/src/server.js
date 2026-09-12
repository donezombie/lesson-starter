const express = require('express');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const helloRoute = require('./routes/hello.route');
const authRoute = require('./routes/auth.route');
const meRoute = require('./routes/me.route');
const employeeRoute = require('./routes/employee.route');

const app = express();
const PORT = process.env.PORT || 4100;

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/', authRoute);
app.use('/api', helloRoute);
app.use('/api', meRoute);
app.use('/api', employeeRoute);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

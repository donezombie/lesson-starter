require('dotenv').config();

const express = require('express');
const cors = require('cors');
// Patches Express's router so a rejected promise from any `async` route
// handler is automatically forwarded to the error-handling middleware
// below, instead of becoming an unhandled rejection that crashes the
// process. Must be required after `express` and before any router
// (including the ones inside the route files below) is created/used.
require('express-async-errors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const helloRoute = require('./routes/hello.route');
const authRoute = require('./routes/auth.route');
const meRoute = require('./routes/me.route');
const employeeRoute = require('./routes/employee.route');
const attendanceRoute = require('./routes/attendance.route');
const leaveRoute = require('./routes/leave.route');
const payrollRoute = require('./routes/payroll.route');
const { connectMongo } = require('./store/mongoClient');

const app = express();
const PORT = process.env.PORT || 4100;

// Enable CORS for all origins so any client can call this API.
app.use(cors());

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
app.use('/api', attendanceRoute);
app.use('/api', leaveRoute);
app.use('/api', payrollRoute);

// Catches any error thrown or rejected inside a route handler (including
// an async handler's rejected promise, forwarded here automatically by
// `express-async-errors` above) that wasn't already caught locally, so it
// becomes a normal JSON error response instead of crashing the process
// via an unhandled rejection.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });

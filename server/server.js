require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB, disconnectDB } = require('./src/config/db');

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/employees', require('./src/routes/employees'));
app.use('/api/leaves', require('./src/routes/leaves'));
app.use('/api/attendance', require('./src/routes/attendance'));
app.use('/api/announcements', require('./src/routes/announcements'));

// Unknown API routes -> JSON 404 instead of an HTML page
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// Malformed JSON bodies etc.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5001;

const seedIfEmpty = async () => {
  try {
    const User = require('./src/models/User');
    if ((await User.countDocuments()) === 0) {
      console.log('No users found. Creating demo accounts...');
      const { seedData } = require('./src/seeders/seed');
      await seedData(false);
    }
  } catch (err) {
    console.error('Auto-seed warning:', err.message);
  }
};

const start = async () => {
  try {
    await connectDB();
    await seedIfEmpty();
    const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Change PORT in server/.env (and the proxy in client/vite.config.js).`);
      } else {
        console.error(err);
      }
      process.exit(1);
    });

    const shutdown = async () => {
      server.close();
      await disconnectDB();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Could not start server:', err.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = app;

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/users', require('./routes/users'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/fines', require('./routes/fines'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/payments', require('./routes/payments'));

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Ikibina (Tontine) Management System API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/sign.route');
const profileRoute = require('./routes/profile.route');
const officeRoutes = require('./routes/office.route');
const searchRoutes = require('./routes/search.route');
const reviewRoutes = require('./routes/review.route');
const projectRoutes = require('./routes/project.route');
const projectDesignsRoutes = require('./routes/projectDesign.route');

const cors = require('cors');
const path = require('path');
app.use(cors());
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/images', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // Allow all origins
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'images')));


console.log("ENV SCHEMA:", process.env.DB_SCHEMA);


app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoute);
app.use('/api', officeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-designs', projectDesignsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`));

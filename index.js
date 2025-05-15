require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/sign.route');
const profileRoute = require('./routes/profile.route');
const officeRoutes = require('./routes/office.route');
const searchRoutes = require('./routes/search.route');
const reviewRoutes = require('./routes/review.route');


const cors = require('cors');
console.log("ENV SCHEMA:", process.env.DB_SCHEMA);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoute);
app.use('/api', officeRoutes);
app.use('/api/search', searchRoutes);
app.use('/reviews', reviewRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/sign.route');
const profileRoute = require('./routes/profile.route');

const cors = require('cors');
console.log("ENV SCHEMA:", process.env.DB_SCHEMA);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoute);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

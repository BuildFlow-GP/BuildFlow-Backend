require('dotenv').config();
const express = require('express');
const app = express();
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const authRoutes = require('./routes/sign.route');
const profileRoute = require('./routes/profile.route');
const officeRoutes = require('./routes/office.route');
const searchRoutes = require('./routes/search.route');
const reviewRoutes = require('./routes/review.route');
const projectRoutes = require('./routes/project.route');
const userRoutes = require('./routes/user.route');
const companyRoutes = require('./routes/company.route');
const projectDesignsRoutes = require('./routes/projectDesign.route');
const userFavoritesRoutes = require('./routes/userFav.route');
const notificationRoutes = require('./routes/notifications.route');
const paymentRoutes = require('./routes/payment.route');
const documentRoutes = require('./routes/document.route'); 
const supervisingOfficeRoutes = require('./routes/suproject.route'); // إذا كان لديك مسار لمكتب الإشراف
const cors = require('cors');
const path = require('path');

// app.use(cors());

const corsOptions = {
  origin: '*', // أو استبدل بـ قائمة دومينات محددة في بيئة الإنتاج
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // اجعله true فقط إذا تحتاج إرسال كوكيز مع الطلب
};

app.use(cors(corsOptions));

app.use('/images', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // Allow all origins
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, 'images')));


console.log("ENV SCHEMA:", process.env.DB_SCHEMA);

app.use('/uploads', express.static('uploads'));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoute);
app.use('/api', officeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-designs', projectDesignsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/favorites', userFavoritesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/documents', documentRoutes); 
app.use('/api/projects', supervisingOfficeRoutes); 

const PORT = process.env.PORT || 5000;

console.log(`baseURL:${BASE_URL}`)
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`));

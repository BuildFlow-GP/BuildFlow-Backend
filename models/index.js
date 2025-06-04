const Sequelize = require('sequelize');
const sequelize = require('../config/db.config');

// قاعدة البيانات والتهيئة العامة
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// استدعاء النماذج (Models)
db.User = require('./user.model')(sequelize, Sequelize.DataTypes);
db.Office = require('./office.model')(sequelize, Sequelize.DataTypes);
db.Company = require('./company.model')(sequelize, Sequelize.DataTypes);
db.Project = require('./project.model')(sequelize, Sequelize.DataTypes);
db.Review = require('./review.model')(sequelize, Sequelize.DataTypes);
db.Notification = require('./notifications.model')(sequelize, Sequelize.DataTypes);
db.ProjectDesign = require('./projectDesign.model')(sequelize, Sequelize.DataTypes);
db.UserFavorite = require('./userFav.model')(sequelize, Sequelize.DataTypes); // <-- إضافة النموذج الجديد


// العلاقات (Associations)

// --- Office Relationships ---
db.Office.hasMany(db.Project, { foreignKey: 'office_id' });
db.Office.hasMany(db.Review, { foreignKey: 'office_id' });

// --- Company Relationships ---
db.Company.hasMany(db.Project, { foreignKey: 'company_id' });
db.Company.hasMany(db.Review, { foreignKey: 'company_id' });

// --- Project Relationships ---
db.Project.hasMany(db.Review, { foreignKey: 'project_id' });
db.Project.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.Project.belongsTo(db.Company, { foreignKey: 'company_id', as: 'company' });
db.Project.belongsTo(db.Office, { foreignKey: 'office_id', as: 'office' });

// --- ProjectDesign Relationship ---
db.ProjectDesign.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });

// --- User Relationships ---
db.User.hasMany(db.Project, { foreignKey: 'user_id', as: 'projects' });
db.User.hasMany(db.Review, { foreignKey: 'user_id' });
// db.User.hasMany(db.Notification, { foreignKey: 'user_id', as: 'notifications' });
db.User.hasMany(db.UserFavorite, { foreignKey: 'user_id', as: 'favorites' }); // <-- إضافة علاقة المفضلة للمستخدم


// --- Notification Relationship ---
// db.Notification.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });


// --- Review Relationships ---
db.Review.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.Review.belongsTo(db.Company, { foreignKey: 'company_id', as: 'company' });
db.Review.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.Review.belongsTo(db.Office, { foreignKey: 'office_id', as: 'office' });

// مزامنة الجداول مع قاعدة البيانات (اختياري في بيئة التطوير)
db.sequelize.sync({ alter: true }).then(() => {
  console.log('Database & tables synced!');
});

module.exports = db;


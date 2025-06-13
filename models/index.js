// index.js (أو models/index.js)
const Sequelize = require('sequelize');
const sequelize = require('../config/db.config');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// استدعاء النماذج (Models)
db.User = require('./user.model')(sequelize, Sequelize.DataTypes);
db.Office = require('./office.model')(sequelize, Sequelize.DataTypes);
db.Company = require('./company.model')(sequelize, Sequelize.DataTypes);
db.Project = require('./project.model')(sequelize, Sequelize.DataTypes); //  هذا يستدعي Project.associate لاحقاً
db.Review = require('./review.model')(sequelize, Sequelize.DataTypes);
db.Notification = require('./notifications.model')(sequelize, Sequelize.DataTypes); //  تأكدي أن اسم الملف notifications.model.js
db.ProjectDesign = require('./projectDesign.model')(sequelize, Sequelize.DataTypes);
db.UserFavorite = require('./userFav.model')(sequelize, Sequelize.DataTypes);


// --- العلاقات (Associations) ---
//  ✅✅✅  السطور التالية المتعلقة بـ Project يجب إزالتها أو التعليق عليها  ✅✅✅
// db.Project.hasMany(db.Review, { foreignKey: 'project_id' });
// db.Project.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
// db.Project.belongsTo(db.Company, { foreignKey: 'company_id', as: 'company' });
// db.Project.belongsTo(db.Office, { foreignKey: 'office_id', as: 'office' }); //  هذه هي التي كانت تسبب التعارض مع alias 'designOffice'
// db.Project.hasOne(db.ProjectDesign, { foreignKey: 'project_id', as: 'projectDesign' });


//  أبقي على تعريفات العلاقات للموديلات الأخرى هنا (User, Office, Company, Review, إلخ)
//  أو (وهو الأفضل) قومي بنقل كل تعريفات associate إلى داخل ملفات الموديلات المعنية.

// --- Office Relationships ---
//  يفضل نقل هذا إلى office.model.js -> Office.associate = (models) => { ... }
db.Office.hasMany(db.Project, { foreignKey: 'office_id', as: 'designedProjects' }); //  اسم مستعار مختلف
db.Office.hasMany(db.Project, { foreignKey: 'supervising_office_id', as: 'supervisedProjects' }); //  اسم مستعار مختلف
db.Office.hasMany(db.Review, { foreignKey: 'office_id', as: 'reviewsReceived' });


// --- Company Relationships ---
//  يفضل نقل هذا إلى company.model.js
db.Company.hasMany(db.Project, { foreignKey: 'company_id', as: 'projects' });
db.Company.hasMany(db.Review, { foreignKey: 'company_id', as: 'reviewsReceived' });

// --- User Relationships ---
//  يفضل نقل هذا إلى user.model.js
db.User.hasMany(db.Project, { foreignKey: 'user_id', as: 'projects' }); //  'projects' هو الاسم المستعار هنا
db.User.hasMany(db.Review, { foreignKey: 'user_id', as: 'reviewsGiven' });
db.User.hasMany(db.UserFavorite, { foreignKey: 'user_id', as: 'favorites' });

// --- Notification Relationship ---
//  يفضل نقل هذا إلى notifications.model.js (إذا كان هناك علاقة مباشرة)
// db.Notification.belongsTo(db.User, { foreignKey: 'actor_id', as: 'actorUser', constraints: false, scope: {actor_type: 'individual'} });
// db.Notification.belongsTo(db.Office, { foreignKey: 'actor_id', as: 'actorOffice', constraints: false, scope: {actor_type: 'office'} });
// ... وهكذا

// --- Review Relationships ---
//  يفضل نقل هذا إلى review.model.js
db.Review.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.Review.belongsTo(db.Company, { foreignKey: 'company_id', as: 'company', required: false });
db.Review.belongsTo(db.Project, { foreignKey: 'project_id', as: 'project' });
db.Review.belongsTo(db.Office, { foreignKey: 'office_id', as: 'office', required: false });

// --- ProjectDesign Relationship (موجودة بالفعل في projectDesign.model.js) ---
//  لا تكرريها هنا

// --- UserFavorite Relationship (يفضل نقلها لـ userFav.model.js أو user.model.js) ---
// db.UserFavorite.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
//  وعلاقات مرنة للـ item_id (متقدم)


//  ✅✅✅  استدعاء associate methods بعد تعريف كل الموديلات ✅✅✅
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});


db.sequelize.sync({ alter: true }).then(() => { //  استخدمي alter: true بحذر
  console.log('Database & tables synced!');
});

module.exports = db;
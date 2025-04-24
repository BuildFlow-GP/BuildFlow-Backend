const Sequelize = require('sequelize');
const sequelize = require('../config/db.config');

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Models
db.User = require('./user.model')(sequelize, Sequelize.DataTypes);
db.Office = require('./office.model')(sequelize, Sequelize.DataTypes);
db.Company = require('./company.model')(sequelize, Sequelize.DataTypes);
db.Project = require('./project.model')(sequelize, Sequelize.DataTypes);
db.Review = require('./review.model')(sequelize, Sequelize.DataTypes);
db.Notification = require('./notification.model')(sequelize, Sequelize.DataTypes);

// Relations
db.User.hasMany(db.Project, { foreignKey: 'user_id' });
db.Office.hasMany(db.Project, { foreignKey: 'office_id' });
db.Company.hasMany(db.Project, { foreignKey: 'company_id' });

db.User.hasMany(db.Review, { foreignKey: 'user_id' });
db.Company.hasMany(db.Review, { foreignKey: 'company_id' });
db.Project.hasMany(db.Review, { foreignKey: 'project_id' });

db.User.hasMany(db.Notification, { foreignKey: 'user_id' });

// Sync the schema (optional in dev)
db.sequelize.sync({ alter: true }).then(() => {
  console.log('Database & tables synced!');
});

module.exports = db;

const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/db.config.js');

const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
  host: config.HOST,
  dialect: 'postgres',
  logging: false,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.Userss = require('./userss.model.js')(sequelize, DataTypes);
db.Offices = require('./offices.model.js')(sequelize, DataTypes);
db.Companies = require('./companies.model.js')(sequelize, DataTypes);
db.Projects = require('./projects.model.js')(sequelize, DataTypes);
db.Reviews = require('./reviews.model.js')(sequelize, DataTypes);
db.Notifications = require('./notifications.model.js')(sequelize, DataTypes);

// Define relations
db.Userss.hasMany(db.Projects, { foreignKey: 'user_id' });
db.Projects.belongsTo(db.Userss, { foreignKey: 'user_id' });

db.Offices.hasMany(db.Projects, { foreignKey: 'office_id' });
db.Projects.belongsTo(db.Offices, { foreignKey: 'office_id' });

db.Companies.hasMany(db.Projects, { foreignKey: 'company_id' });
db.Projects.belongsTo(db.Companies, { foreignKey: 'company_id' });

db.Userss.hasMany(db.Reviews, { foreignKey: 'user_id' });
db.Companies.hasMany(db.Reviews, { foreignKey: 'company_id' });
db.Projects.hasMany(db.Reviews, { foreignKey: 'project_id' });

db.Userss.hasMany(db.Notifications, { foreignKey: 'user_id' });

module.exports = db;

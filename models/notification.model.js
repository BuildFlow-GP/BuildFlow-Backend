module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('notifications', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: false,
    });
  
    return Notification;
  };
  
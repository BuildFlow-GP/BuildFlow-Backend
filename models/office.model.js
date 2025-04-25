module.exports = (sequelize, DataTypes) => {
    const Office = sequelize.define('offices', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      phone: DataTypes.STRING(20),
      location: { type: DataTypes.TEXT, allowNull: false },
      capacity: DataTypes.INTEGER,
      rating: DataTypes.FLOAT,
      is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
      points: { type: DataTypes.INTEGER, defaultValue: 0 },
      bank_account: DataTypes.STRING(100),
      staff_count: DataTypes.INTEGER,
      active_projects_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      branches: DataTypes.TEXT,
      profile_image: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: false,
    });
  
    return Office;
  };
  
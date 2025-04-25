module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('userss', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      phone: DataTypes.STRING(20),
      id_number: DataTypes.STRING(50),
      bank_account: DataTypes.STRING(100),
      location: DataTypes.TEXT,
      profile_image: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: false,
    });
  
    return User;
  };
  
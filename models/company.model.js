module.exports = (sequelize, DataTypes) => {
    const Company = sequelize.define('companies', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      email: DataTypes.STRING(100),
      phone: DataTypes.STRING(20),
      password_hash: { type: DataTypes.TEXT, allowNull: false },
      description: DataTypes.TEXT,
      rating: DataTypes.FLOAT,
      company_type: DataTypes.STRING(100),
      location: DataTypes.TEXT,
      bank_account: DataTypes.STRING(100),
      staff_count: DataTypes.INTEGER,
      profile_image: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: false,
    });
  
    return Company;
  };
  
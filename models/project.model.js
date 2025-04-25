module.exports = (sequelize, DataTypes) => {
    const Project = sequelize.define('projects', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: DataTypes.TEXT,
      status: { type: DataTypes.STRING(50), defaultValue: 'Pending' },
      budget: DataTypes.DECIMAL(12, 2),
      start_date: DataTypes.DATE,
      end_date: DataTypes.DATE,
      location: DataTypes.TEXT,
      license_file: DataTypes.TEXT,
      agreement_file: DataTypes.TEXT,
      document_2d: DataTypes.TEXT,
      document_3d: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: false,
    });
  
    return Project;
  };
  
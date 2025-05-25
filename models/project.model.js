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
    land_area: DataTypes.DECIMAL(10, 2),         // مساحة الأرض
    plot_number: DataTypes.STRING(50),           // رقم القطعة
    basin_number: DataTypes.STRING(50),          // رقم الحوض
    land_location: DataTypes.TEXT,               // موقع الأرض
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, {
    timestamps: false,
  });

  return Project;
};
// This model defines the structure of the 'projects' table in the database.
// It includes fields for project details such as name, description, status, budget, dates, and location.
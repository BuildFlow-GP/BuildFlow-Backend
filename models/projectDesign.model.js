module.exports = (sequelize, DataTypes) => {
  const ProjectDesign = sequelize.define('ProjectDesign', {
    floor_count: DataTypes.INTEGER,
    bedrooms: DataTypes.INTEGER,
    bathrooms: DataTypes.INTEGER,
    kitchens: DataTypes.INTEGER,
    balconies: DataTypes.INTEGER,
    special_rooms: DataTypes.ARRAY(DataTypes.TEXT),
    directional_rooms: DataTypes.JSONB,
    kitchen_type: DataTypes.STRING,
    master_has_bathroom: DataTypes.BOOLEAN,
    general_description: DataTypes.TEXT,
    interior_design: DataTypes.TEXT,
    room_distribution: DataTypes.TEXT,
  }, {
    tableName: 'project_designs',
    underscored: true,
  });

  ProjectDesign.associate = (models) => {
    ProjectDesign.belongsTo(models.Project, {
      foreignKey: 'project_id',
      onDelete: 'CASCADE',
    });
  };

  return ProjectDesign;
};

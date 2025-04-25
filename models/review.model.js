module.exports = (sequelize, DataTypes) => {
    const Review = sequelize.define('reviews', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      rating: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
      comment: DataTypes.TEXT,
      reviewed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: false,
    });
  
    return Review;
  };
  
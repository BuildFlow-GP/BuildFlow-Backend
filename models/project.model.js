// models/project.model.js (النسخة المصححة والمبسطة)
module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('projects', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false }, // اسم المشروع (قد يكون نوع التصميم مبدئياً)
    description: { type: DataTypes.TEXT, allowNull: true }, // الوصف الكامل للمشروع
    status: { 
      type: DataTypes.STRING(50), 
      defaultValue: 'Pending Office Approval',
      allowNull: false,
      validate: {
        isIn: [[
          'Pending Office Approval', 
          'Office Approved - Awaiting Details', 
          'Office Rejected',
          'Details Submitted - Pending Office Review',
          'Awaiting Payment Proposal',
          'Awaiting Payment Proposal by Office', // ✅  أضيفي هذه إذا كنتِ ستستخدمينها
          'Payment Proposal Sent',  
          'Awaiting User Payment',
          'In Progress', 
          'Completed', 
          'Cancelled'
        ]]
      }
    },
    budget: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    start_date: { type: DataTypes.DATE, allowNull: true },
    end_date: { type: DataTypes.DATE, allowNull: true },
    location: { type: DataTypes.TEXT, allowNull: true }, // الموقع العام للمشروع (قد يكون مختلفاً عن عنوان المستخدم)
    
    land_area: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    plot_number: { type: DataTypes.STRING(50), allowNull: true },
    basin_number: { type: DataTypes.STRING(50), allowNull: true },
    land_location: { type: DataTypes.TEXT, allowNull: true }, // موقع الأرض التفصيلي

    license_file: { type: DataTypes.TEXT, allowNull: true },
    agreement_file: { type: DataTypes.TEXT, allowNull: true }, // هذا هو الملف من الخطوة 2
    document_2d: { type: DataTypes.TEXT, allowNull: true },
    document_3d: { type: DataTypes.TEXT, allowNull: true },
    architectural_file: { type: DataTypes.TEXT, allowNull: true },
    structural_file: { type: DataTypes.TEXT, allowNull: true },
    electrical_file: { type: DataTypes.TEXT, allowNull: true },
    mechanical_file: { type: DataTypes.TEXT, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },


    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    

     proposed_payment_amount: { //  المبلغ المقترح من المكتب
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    payment_notes: { //  ملاحظات المكتب على الدفع
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_status: { //  لتتبع حالة الدفع
      type: DataTypes.STRING(50),
      allowNull: true, //  قد يكون 'Pending', 'Paid', 'Failed'
      defaultValue: 'Pending'
    },

    // ✅✅✅ حقل جديد لتقدم المشروع ✅✅✅
    progress_stage: { //  يمثل رقم المرحلة الحالية (مثلاً 0 إلى 5)
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0 //  أو 1 إذا كانت المرحلة الأولى تبدأ بـ 1
    },
    //  يمكنكِ تعريف المراحل كنصوص في مكان ما في تطبيقك (مثلاً 5 مراحل)
    //  1: Initial Design, 2: Revisions, 3: Finalizing 2D, 4: 3D Modeling, 5: Delivery
    
    user_id: { // FK لـ userss
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'userss', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL', // أو CASCADE
    },
    office_id: { // FK لـ offices
      type: DataTypes.INTEGER,
      allowNull: true, //  لأن الطلب المبدئي يربطه بمكتب
      references: { model: 'offices', key: 'id' },
      onUpdate: 'CASCADE', onDelete: 'SET NULL',
    },
  }, {
    timestamps: false,
    underscored: true, //  لاستخدام user_id, office_id في قاعدة البيانات
  });

  Project.associate = (models) => {
    Project.belongsTo(models.User, { //  اسم الموديل User كما هو معرف في Sequelize
      foreignKey: 'user_id',
      as: 'user',
    });
    Project.belongsTo(models.Office, { //  اسم الموديل Office
      foreignKey: 'office_id',
      as: 'office',
    });

     Project.hasOne(models.ProjectDesign, { //  افترض أن اسم موديل Sequelize هو ProjectDesign
      foreignKey: 'project_id',         //  المفتاح الخارجي في جدول project_designs الذي يشير لـ projects
      as: 'projectDesign',            //  نفس الاسم المستعار المستخدم في include
      onDelete: 'CASCADE',            //  إذا حذف المشروع، يحذف التصميم المرتبط
      onUpdate: 'CASCADE'
    });
  };

  return Project;
};
// models/project.model.js
module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('projects', {
    // ... (كل حقولك كما هي، بما في ذلك الحقول الجديدة للدفع والتقدم)
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { 
      type: DataTypes.STRING(50), 
      defaultValue: 'Pending Office Approval',
      allowNull: false,
      validate: {
        isIn: [[ /* ... كل حالاتك ... */ 
          'Pending Office Approval', 'Office Approved - Awaiting Details', 'Office Rejected',
          'Details Submitted - Pending Office Review', 'Awaiting Payment Proposal',
          'Payment Proposal Sent', 'Awaiting User Payment', 'In Progress', 'Completed', 'Cancelled',
          'Pending Supervision Approval', 'Supervision Rejected', 'Under Office Supervision',
          'Supervision Payment Proposed', 'Awaiting Supervision Payment', 'Supervision Completed'
        ]]
      }
    },
    supervision_weeks_target: { //  العدد الإجمالي لأسابيع الإشراف
      type: DataTypes.INTEGER,
      allowNull: true
    },
    supervision_weeks_completed: { //  عدد الأسابيع التي تم "رفع" تقرير لها
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    planner5dUrl: { type: DataTypes.TEXT, allowNull: true },
    budget: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    start_date: { type: DataTypes.DATE, allowNull: true },
    end_date: { type: DataTypes.DATE, allowNull: true },
    location: { type: DataTypes.TEXT, allowNull: true },
    land_area: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    plot_number: { type: DataTypes.STRING(50), allowNull: true },
    basin_number: { type: DataTypes.STRING(50), allowNull: true },
    land_location: { type: DataTypes.TEXT, allowNull: true },
    license_file: { type: DataTypes.TEXT, allowNull: true },
    agreement_file: { type: DataTypes.TEXT, allowNull: true },
    document_2d: { type: DataTypes.TEXT, allowNull: true },
    document_3d: { type: DataTypes.TEXT, allowNull: true },
    architectural_file: { type: DataTypes.TEXT, allowNull: true },
    structural_file: { type: DataTypes.TEXT, allowNull: true },
    electrical_file: { type: DataTypes.TEXT, allowNull: true },
    mechanical_file: { type: DataTypes.TEXT, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    proposed_payment_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    payment_notes: { type: DataTypes.TEXT, allowNull: true },
    payment_status: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'Pending' },
    progress_stage: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }, //  ✅ تأكدي من عدم تكرار created_at
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'userss', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
    office_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'offices', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
    supervising_office_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'offices', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
    assigned_company_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'companies', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }
  }, {
    timestamps: false,
    underscored: true,
    tableName: 'projects' //  تأكيد اسم الجدول
  });

  Project.associate = (models) => {
    // علاقة مع المستخدم مالك المشروع
    Project.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user' //  ✅  الاسم المستعار هنا 'user'
    });
    
    // علاقة مع المكتب المصمم
    Project.belongsTo(models.Office, { 
      foreignKey: 'office_id', //  هذا هو FK للمكتب المصمم
      as: 'office'    //  ✅  اسم مستعار واضح: 'office'
    });

    // علاقة مع المكتب المشرف
    Project.belongsTo(models.Office, { 
      foreignKey: 'supervising_office_id', 
      as: 'supervisingOffice' //  ✅  اسم مستعار واضح
    });

    // علاقة مع الشركة المنفذة (إذا وجدت)
    Project.belongsTo(models.Company, { 
      foreignKey: 'assigned_company_id', 
      as: 'company',
      required: false 
    });

    // علاقة مع تفاصيل التصميم
    Project.hasOne(models.ProjectDesign, {
      foreignKey: 'project_id', //  المفتاح الخارجي في جدول project_designs
      as: 'projectDesign',    //  ✅  اسم مستعار واضح
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    // علاقة مع المراجعات (إذا أردتِ تضمينها لاحقاً)
    Project.hasMany(models.Review, { 
      foreignKey: 'project_id', 
      as: 'reviews' 
    });
  };

  return Project;
};
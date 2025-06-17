// routes/project.route.js
const express = require('express');
const router = express.Router();
const { Project, User, Office, Company, Notification, ProjectDesign } = require('../models'); 
const { Op } = require('sequelize');
const authenticate = require('../middleware/authenticate');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs'); 

const commonDocumentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Word documents are allowed.'), false);
  }
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';


router.post('/:projectId/request-supervision', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { supervising_office_id, assigned_company_id } = req.body; //  الشركة اختيارية
    const userId = req.user.id; //  المستخدم الحالي من التوكن
    const userName = req.user.name || 'A User'; //  اسم المستخدم من التوكن

    if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid Project ID.'});
    }
    if (!supervising_office_id || isNaN(parseInt(supervising_office_id, 10))) {
      return res.status(400).json({ message: 'Supervising Office ID is required and must be a number.' });
    }
    if (assigned_company_id && isNaN(parseInt(assigned_company_id, 10))) {
      return res.status(400).json({ message: 'Assigned Company ID must be a number if provided.' });
    }

    // 1. جلب المشروع والتحقق من ملكية المستخدم
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.user_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this project.' });
    }

    // 2. التحقق من أن حالة المشروع تسمح بطلب إشراف
    //    (مثلاً، المشروع مكتمل من ناحية التصميم أو في مرحلة معينة)
    //    هذا الشرط يعتمد على منطق عملك. سأفترض مبدئياً أن أي مشروع يمكن طلب إشراف له.
    //    يمكنكِ إضافة حالات محددة هنا:
    // const allowedStatusForSupervisionRequest = ['Completed', 'In Progress', /* ... */];
    // if (!allowedStatusForSupervisionRequest.includes(project.status)) {
    //   return res.status(400).json({ message: `Cannot request supervision for project in status: '${project.status}'.` });
    // }

    // 3. التحقق من وجود المكتب المشرف (والشركة إذا تم اختيارها)
    const supervisingOffice = await Office.findByPk(supervising_office_id);
    if (!supervisingOffice) {
      return res.status(404).json({ message: `Supervising office with ID ${supervising_office_id} not found.` });
    }
    if (assigned_company_id) {
      const assignedCompany = await Company.findByPk(assigned_company_id);
      if (!assignedCompany) {
        return res.status(404).json({ message: `Assigned company with ID ${assigned_company_id} not found.` });
      }
    }

    // 4. تحديث المشروع بالمعلومات الجديدة وتغيير الحالة
    project.supervising_office_id = parseInt(supervising_office_id, 10);
    project.assigned_company_id = assigned_company_id ? parseInt(assigned_company_id, 10) : null;
    project.status = 'Pending Supervision Approval'; //  الحالة الجديدة
    await project.save();

    // 5. إنشاء إشعار للمكتب المشرف
    try {
      await Notification.create({
        recipient_id: supervisingOffice.id, //  ID المكتب المشرف
        recipient_type: 'office',
        actor_id: userId,
        actor_type: req.user.userType.toLowerCase(), // 'individual'
        notification_type: 'NEW_SUPERVISION_REQUEST',
        message: `User '${userName}' requests your supervision for project: '${project.name}'.`,
        target_entity_id: project.id,
        target_entity_type: 'project',
      });
      console.log(`Notification sent to office ${supervisingOffice.id} for supervision request on project ${project.id}.`);
    } catch (notificationError) {
      console.error('Failed to create supervision request notification:', notificationError);
    }

    // إرجاع المشروع المحدث
    const updatedProject = await Project.findByPk(projectId, { //  لإرجاع المشروع مع أي includes إذا أردت
        include: [
            { model: User, as: 'user', attributes: {exclude: ['password_hash']} },
            { model: Office, as: 'office', required: false }, //  المكتب المصمم
            { model: Office, as: 'supervisingOffice', required: false }, //  المكتب المشرف
            { model: Company, as: 'company', required: false },
            { model: ProjectDesign, as: 'projectDesign', required: false }
        ]
    });
    res.status(200).json({ message: 'Supervision request sent successfully.', project: updatedProject });

  } catch (error) {
    console.error('Error requesting project supervision:', error);
    res.status(500).json({ message: 'Failed to request project supervision.' });
  }
});

router.put('/:projectId/respond-supervision', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
    
    const officeIdAsActor = req.user.id; // ID المكتب الذي يقوم بالرد (من التوكن)
    const officeNameAsActor = req.user.name || 'The Supervising Office';

    // 1. التحقق أن المستخدم الحالي هو مكتب
    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can respond to supervision requests.' });
    }

    // 2. التحقق من صلاحية 'action'
    if (!action || (action.toLowerCase() !== 'approve' && action.toLowerCase() !== 'reject')) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject".' });
    }

    // 3. جلب المشروع والتحقق منه
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] // لجلب مالك المشروع للإشعار
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // 4. التأكد أن المكتب الحالي هو المكتب المطلوب للإشراف
    if (project.supervising_office_id !== officeIdAsActor) {
      return res.status(403).json({ message: 'Forbidden: You are not the designated supervising office for this project.' });
    }

    // 5. التأكد أن المشروع في حالة "Pending Supervision Approval"
    if (project.status !== 'Pending Supervision Approval') {
      return res.status(400).json({ message: `Cannot respond to supervision request. Project status is '${project.status}'.` });
    }

    let newStatus = '';
    let userNotificationType = '';
    let userNotificationMessage = '';

    if (action.toLowerCase() === 'approve') {
      newStatus = 'Under Office Supervision';
      userNotificationType = 'SUPERVISION_REQUEST_APPROVED';
      userNotificationMessage = `Office '${officeNameAsActor}' has APPROVED your request for supervision on project: '${project.name}'.`;
      project.rejection_reason = null; //  مسح سبب الرفض إذا كان موجوداً
    } else { // action === 'reject'
      newStatus = 'Supervision Rejected'; //  أو يمكنكِ إعادته لحالة سابقة أو تركه للمستخدم ليختار مكتباً آخر
      userNotificationType = 'SUPERVISION_REQUEST_REJECTED';
      userNotificationMessage = `Office '${officeNameAsActor}' has REJECTED your request for supervision on project: '${project.name}'.`;
      if (rejection_reason) {
        userNotificationMessage += ` Reason: ${rejection_reason}`;
      }
      //  عند الرفض، قد ترغبين في مسح supervising_office_id و assigned_company_id
      //  حتى يتمكن المستخدم من إعادة الطلب لمكتب آخر
      project.supervising_office_id = null;
      project.assigned_company_id = null; //  إذا كان مرتبطاً بطلب الإشراف هذا
      project.rejection_reason = rejection_reason || 'Supervision request was rejected by the office.';
    }

    project.status = newStatus;
    await project.save();

    // 6. إرسال إشعار للمستخدم (مالك المشروع)
    if (project.user_id && project.user) {
      try {
        await Notification.create({
          recipient_id: project.user_id,
          recipient_type: 'individual',
          actor_id: officeIdAsActor,
          actor_type: 'office',
          notification_type: userNotificationType,
          message: userNotificationMessage,
          target_entity_id: project.id,
          target_entity_type: 'project',
        });
        console.log(`Notification sent to user ${project.user_id} about supervision response for project ${project.id}.`);
      } catch (notificationError) {
        console.error('Failed to create supervision response notification for user:', notificationError);
      }
    }

    // 7. إرجاع المشروع المحدث
    const updatedProject = await Project.findByPk(projectId, { /* ... نفس الـ includes من الـ route السابق ... */ 
        include: [
            { model: User, as: 'user', attributes: {exclude: ['password_hash']} },
            { model: Office, as: 'office', required: false },
            { model: Office, as: 'supervisingOffice', required: false },
            { model: Company, as: 'company', required: false },
            { model: ProjectDesign, as: 'projectDesign', required: false }
        ]
    });
    res.status(200).json({ message: `Supervision request ${action.toLowerCase()}ed successfully.`, project: updatedProject });

  } catch (error) {
    console.error('Error responding to supervision request:', error);
    res.status(500).json({ message: 'Failed to respond to supervision request.' });
  }
});

function ensureUploadsDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
const supervisionReportStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `uploads/supervision_reports/${req.params.projectId}/`;
    ensureUploadsDirectoryExists(dir); //  تأكدي من وجود هذه الدالة
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    //  يمكن إضافة رقم الأسبوع لاسم الملف إذا أردتِ، ولكن الملف سيُكتب فوقه
    cb(null, `supervision_report_w${req.body.week_number || 'current'}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const uploadSupervisionReport = multer({ storage: supervisionReportStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: commonDocumentFileFilter });


router.post('/:projectId/supervision-report', authenticate, uploadSupervisionReport.single('reportFile'), async (req, res) => {
                                                                       //  'reportFile' هو اسم الحقل من Flutter
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { week_number } = req.body; //  المكتب سيرسل رقم الأسبوع الذي يخصه هذا التقرير
    const officeId = req.user.id;

    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload supervision reports.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No report file uploaded or file type not allowed.' });
    }
    if (!week_number || isNaN(parseInt(week_number)) || parseInt(week_number) <= 0) {
      return res.status(400).json({ message: 'Valid week_number is required.' });
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      //  احذفي الملف الذي تم رفعه إذا لم يكن هناك مشروع
      // fs.unlinkSync(req.file.path); 
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.supervising_office_id !== officeId) {
      // fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Forbidden: You are not the supervising office for this project.' });
    }
    if (parseInt(week_number) > (project.supervision_weeks_target || 0) ) {
      // fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Week number ${week_number} exceeds target weeks (${project.supervision_weeks_target || 0}).` });
    }

    const filePath = `${req.file.destination.replace(/^uploads\//i, '')}${req.file.filename}`;
    
    //  ✅ تحديث حقل agreement_file (أو حقل آخر مخصص لآخر تقرير)
    project.agreement_file = filePath; //  أو project.latest_supervision_report_file
    
    //  ✅ تحديث عدد الأسابيع المكتملة
    project.supervision_weeks_completed = parseInt(week_number);
    
    //  (اختياري) تحديث progress_stage الكلي إذا كان مختلفاً
    // project.progress_stage = calculateOverallProgress(project.supervision_weeks_completed, project.supervision_weeks_target);

    await project.save();

    //  TODO: إرسال إشعار للمستخدم بأن تقرير الأسبوع X تم رفعه

    res.json({ 
      message: `Supervision report for week ${week_number} uploaded successfully.`, 
      filePath: filePath, //  المسار النسبي للملف
      project: project //  المشروع المحدث
    });

  } catch (error) {
    console.error('Error uploading supervision report:', error);
    //  ... معالجة الخطأ ...
    res.status(500).json({ message: 'Failed to upload supervision report.' });
  }
});


//user
router.get('/user/supervision', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.userType.toLowerCase() !== 'individual') { //  أو 'user'
      return res.status(403).json({ message: "Forbidden: Only for individual users." });
    }

    const supervisionStatuses = [
      'Pending Supervision Approval', 'Under Office Supervision',
      'Supervision Payment Proposed', 'Awaiting Supervision Payment', 'Supervision Completed',
      'Supervision Request Rejected', 'Supervision Cancelled' //  أضيفي حالات الرفض والإلغاء أيضاً إذا أردتِ عرضها
    ];

    const projects = await Project.findAll({
      where: {
        user_id: userId,
        status: { [Op.in]: supervisionStatuses } //  Sequelize Op.in
      },
      include: [
        { 
          model: Office, 
          as: 'supervisingOffice', //  المكتب المشرف
          attributes: ['id', 'name', 'profile_image'], //  الحقول المطلوبة
          required: false //  قد لا يكون هناك مكتب مشرف بعد (Pending Supervision Approval) أو إذا رُفض
        },
        // يمكنكِ تضمين المكتب المصمم (designOffice) أو الشركة (assignedCompany) إذا احتجتِ لعرضهم هنا أيضاً
        // { model: Office, as: 'designOffice', attributes: ['id', 'name'], required: false },
        // { model: Company, as: 'assignedCompany', attributes: ['id', 'name'], required: false }
      ],
      order: [['created_at', 'DESC']] //  أو حسب تاريخ التحديث، أو الحالة
    });

    //  تنسيق مسارات الصور (إذا لزم الأمر وكان BaseUrl لم يضف بعد)
    const formattedProjects = projects.map(p => {
        const projectJson = p.toJSON();
        if (projectJson.supervisingOffice && projectJson.supervisingOffice.profile_image) {
            projectJson.supervisingOffice.profile_image = formatImagePath(projectJson.supervisingOffice.profile_image);
        }
        // ... (تنسيق صور designOffice و assignedCompany إذا تم تضمينهم)
        return projectJson;
    });
    
    res.json(formattedProjects);

  } catch (error) {
    console.error('Error fetching user supervision projects:', error);
    res.status(500).json({ message: 'Failed to fetch supervision projects.' });
  }
});



//  مكتب
router.get('/office/supervision', authenticate, async (req, res) => { // أو /supervised-by-me
  try {
    const officeId = req.user.id; // ID المكتب من التوكن
    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: "Forbidden: Only for offices." });
    }

    //  يمكنكِ أيضاً فلترة بالحالة إذا أردتِ (مثلاً، عدم عرض المشاريع الملغاة أو المكتملة جداً)
    // const supervisionStatuses = [
    //   'Pending Supervision Approval', 'Under Office Supervision',
    //   'Supervision Payment Proposed', 'Awaiting Supervision Payment', 'Supervision Completed'
    // ];

    const projects = await Project.findAll({
      where: {
        supervising_office_id: officeId,
        // status: { [Op.in]: supervisionStatuses } //  فلترة بالحالة (اختياري)
      },
      include: [
        { 
          model: User, 
          as: 'user', //  مالك المشروع
          attributes: ['id', 'name', 'profile_image'], //  الحقول المطلوبة
          required: true //  نفترض أن كل مشروع إشراف له مستخدم
        },
        // يمكنكِ تضمين المكتب المصمم (designOffice) أو الشركة (assignedCompany) إذا احتجتِ لعرضهم هنا أيضاً
      ],
      order: [['created_at', 'DESC']] //  أو created_at، أو status
    });
    
    //  تنسيق مسارات الصور
    const formattedProjects = projects.map(p => {
        const projectJson = p.toJSON();
        if (projectJson.user && projectJson.user.profile_image) {
            projectJson.user.profile_image = formatImagePath(projectJson.user.profile_image);
        }
        return projectJson;
    });

    res.json(formattedProjects);

  } catch (error) {
    console.error('Error fetching office assigned supervision projects:', error);
    res.status(500).json({ message: 'Failed to fetch assigned supervision projects.' });
  }
});


//  شركة
router.get('/company/supervision', authenticate, async (req, res) => {
  try {
    const companyId = req.user.id; // ID الشركة من التوكن
    if (req.user.userType.toLowerCase() !== 'company') {
      return res.status(403).json({ message: "Forbidden: Only for companies." });
    }

    //  حالات الإشراف التي تهم الشركة المنفذة
    //  (عادةً عندما يكون المشروع تحت الإشراف فعلياً أو مكتمل الإشراف)
    const relevantSupervisionStatuses = [
      'Under Office Supervision',
      'Supervision Payment Proposed', //  قد تحتاج الشركة لمعرفة هذا
      'Awaiting Supervision Payment', //  قد تحتاج الشركة لمعرفة هذا
      'Supervision Completed'
      //  قد لا تهم الشركة حالات مثل 'Pending Supervision Approval' إذا لم تكن طرفاً فيها بعد
    ];

    const projects = await Project.findAll({
      where: {
        assigned_company_id: companyId,
        status: { [Op.in]: relevantSupervisionStatuses } //  فلترة بالحالات ذات الصلة
      },
      include: [
        { 
          model: User, 
          as: 'user', //  مالك المشروع
          attributes: ['id', 'name', 'profile_image'],
          required: true 
        },
        { 
          model: Office, 
          as: 'supervisingOffice', //  المكتب المشرف (مهم للشركة)
          attributes: ['id', 'name', 'profile_image'],
          required: false //  قد يكون true إذا كانت كل المشاريع هنا يجب أن يكون لها مشرف
        },
        { 
          model: Office, 
          as: 'office', //  المكتب المصمم (اختياري، قد يكون مفيداً)
          attributes: ['id', 'name'],
          required: false
        }
        // لا نحتاج لتضمين assignedCompany هنا لأننا نبحث بناءً عليه
      ],
      order: [['updated_at', 'DESC']]
    });
    
    //  تنسيق مسارات الصور
    const formattedProjects = projects.map(p => {
        const projectJson = p.toJSON();
        if (projectJson.user && projectJson.user.profile_image) {
            projectJson.user.profile_image = formatImagePath(projectJson.user.profile_image);
        }
        if (projectJson.supervisingOffice && projectJson.supervisingOffice.profile_image) {
            projectJson.supervisingOffice.profile_image = formatImagePath(projectJson.supervisingOffice.profile_image);
        }
        if (projectJson.designOffice && projectJson.designOffice.profile_image) {
            projectJson.designOffice.profile_image = formatImagePath(projectJson.designOffice.profile_image);
        }
        return projectJson;
    });

    res.json(formattedProjects);

  } catch (error) {
    console.error('Error fetching company assigned supervision projects:', error);
    res.status(500).json({ message: 'Failed to fetch assigned supervision projects for company.' });
  }
});

//  لا تنسي Op و formatImagePath إذا كانت formatImagePath معرفة محلياً
// module.exports = router;

const formatImagePath = (imagePath) => imagePath && !imagePath.startsWith('http') ? `${BASE_URL}/${imagePath.replace(/\\/g, '/')}` : imagePath;


module.exports = router;
const express = require('express');
const router = express.Router();
const { Project, Notification, Review, User, Company, Office, ProjectDesign } = require('../models');
const authenticate = require('../middleware/authenticate');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper function to ensure directory exists
function ensureUploadsDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// إعدادات تخزين Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/agreements/'); // تأكدي أن هذا المجلد موجود
  },
  filename: function (req, file, cb) {
    // projectId-timestamp-originalname
    cb(null, `${req.params.projectId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') { // السماح بـ PDF فقط
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 5MB حد أقصى
    fileFilter: fileFilter
});




// --- إعدادات Multer لملف الرخصة (License) - يرفعه المستخدم ---
const licenseStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `uploads/licenses/${req.params.projectId}/`; //  مجلد خاص لكل مشروع
    ensureUploadsDirectoryExists(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `license-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const licenseFileFilter = (req, file, cb) => { //  يمكنكِ تحديد أنواع ملفات الرخصة (PDF, JPG, PNG)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type for license. Allowed: PDF, JPG, PNG.'), false);
    }
};
const uploadLicense = multer({ 
    storage: licenseStorage, 
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: licenseFileFilter 
});

// --- إعدادات Multer لملف 2D (النهائي من المكتب) ---
const document2DStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `uploads/project_documents/${req.params.projectId}/2d_final/`;
    ensureUploadsDirectoryExists(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `final2D-${Date.now()}${path.extname(file.originalname)}`);
  }
});
//  فلتر عام للمستندات (PDF, DWG, ZIP, Images)
const commonDocumentFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/vnd.dwg', 'application/acad', 'application/zip', 'application/x-zip-compressed', 'image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) { cb(null, true); } 
    else { cb(new Error('Invalid file type. Allowed: PDF, DWG, ZIP, JPG, PNG.'), false); }
};
const uploadFinal2D = multer({ 
    storage: document2DStorage, 
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: commonDocumentFileFilter 
});


// --- إعدادات Multer للملف المعماري (Architectural) - من المكتب ---
const architecturalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `uploads/project_documents/${req.params.projectId}/architectural/`;
    ensureUploadsDirectoryExists(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `architectural-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const uploadArchitectural = multer({ 
    storage: architecturalStorage, 
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: commonDocumentFileFilter //  نفس الفلتر العام للمستندات
});



// =======================
// GET /projects — Get all projects
// =======================
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});


// GET /api/projects/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const projects = await Project.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user' },
        { model: Company, as: 'company' },
        { model: Office, as: 'office' },
      ],
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching project suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch project suggestions' });
  }
});



// =======================
// GET /projects/:id — Get single project
// =======================
router.get('/:id', async (req, res) => {
  try {
    const include = [  
      { model: User, as: 'user' },
      { model: Office, as: 'office' },
      { model: Office, as: 'supervisingOffice', required: false },
     { model: Company, as: 'company', required: false  },
      { model: ProjectDesign, as: 'projectDesign', required: false  }
    //  تضمين تصميم المشروع إذا كان موجوداً
    ];
    const project = await Project.findByPk(req.params.id, { include });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// =======================
// POST /projects — Create new project (authenticated)
// =======================
router.post('/', authenticate, async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      user_id: req.user.id // ← ← ← هنا نضيفه يدوياً من التوكن
    };

    const newProject = await Project.create(projectData);
    res.status(201).json(newProject);
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// =======================
// PUT /projects/:id — Update project (authenticated)
// =======================

router.put('/:id', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // ✅ التحقق من ملكية المشروع
    if (project.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this project.' });
    }

    // ✅ التحقق من أن حالة المشروع تسمح بالتعديل من قبل المستخدم
    const allowedStatesForUserEdit = [
        'Office Approved - Awaiting Details', 
        // يمكنكِ إضافة حالات أخرى هنا إذا سمحتِ بالتعديل في مراحل أخرى
        // 'Further Info Requested by Office' 
    ];
    if (!allowedStatesForUserEdit.includes(project.status)) {
        return res.status(400).json({ message: `Project details cannot be updated in the current project status: '${project.status}'` });
    }

 
    const { user_id, office_id, status, agreement_file, license_file, document_2d, document_3d, ...updateData } = req.body;
    
    // إذا كان هناك حقل معين تريدين التأكد من عدم تحديثه، أزيليه من updateData
    // delete updateData.some_field_not_to_update;

    await project.update(updateData);

    //  إرجاع المشروع المحدث بالكامل (اختياري، لكنه مفيد للـ frontend)
    const updatedProject = await Project.findByPk(projectId, {
        include: [ //  يمكنكِ تضمين الـ user والـ office إذا أردتِ
            { model: User, as: 'user', attributes: ['id', 'name', 'profile_image'] },
            { model: Office, as: 'office', attributes: ['id', 'name', 'profile_image'] }
        ]
    });

    res.json({ message: 'Project details updated successfully.', project: updatedProject });

  } catch (err) {
    console.error('Error updating project:', err);
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Failed to update project.' });
  }
});

// =======================
// DELETE /projects/:id — Delete project (authenticated)
// =======================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await project.destroy();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// =======================
// GET /projects/:id/reviews — Get reviews for a project
// =======================
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { project_id: req.params.id },
      include: [{ model: User, attributes: ['id', 'name'], as: 'user' }]
    });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching project reviews:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// =======================
// GET /projects/:id/documents — Get all files related to a project
// =======================
router.get('/:id/documents', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      attributes: ['license_file', 'agreement_file', 'document_2d', 'document_3d']
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// =======================
// GET /projects/:id/status — Get project status
// =======================
router.get('/:id/status', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      attributes: ['status']
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ status: project.status });
  } catch (err) {
    console.error('Error fetching project status:', err);
    res.status(500).json({ message: 'Failed to fetch project status' });
  }
});

// ========================================================
// POST /api/projects/request-initial - لإنشاء طلب مشروع مبدئي
// ========================================================
router.post('/request-initial', authenticate, async (req, res) => {
  try {
    const { office_id, project_type, initial_description } = req.body;
    const user_id = req.user.id; // من التوكن
    const userName = req.user.name || 'A user'; // اسم المستخدم من التوكن (افترض أنه موجود)

    if (!office_id || !project_type) {
      return res.status(400).json({ message: 'Office ID and project type are required.' });
    }

    // التحقق من وجود المكتب (اختياري ولكنه جيد)
    const officeExists = await Office.findByPk(office_id);
    if (!officeExists) {
        return res.status(404).json({ message: `Office with ID ${office_id} not found.` });
    }

    // إنشاء المشروع المبدئي
    const newProject = await Project.create({
      name: project_type, // أو اسم مبدئي آخر
      description: initial_description || null,
      user_id: user_id,
      office_id: office_id,
      status: 'Pending Office Approval', // الحالة الأولية
      // باقي الحقول ستأخذ قيمها الافتراضية أو null
    });

    // إنشاء إشعار للمكتب
    if (newProject && officeExists) {
      try {
        await Notification.create({
          recipient_id: office_id,
          recipient_type: 'office',
          actor_id: user_id,
          actor_type: req.user.userType.toLowerCase(), // 'individual' أو 'user' حسب توكنك
          notification_type: 'NEW_PROJECT_REQUEST',
          message: `User '${userName}' submitted a new project request: '${newProject.name}'.`,
          target_entity_id: newProject.id,
          target_entity_type: 'project',
        });
        console.log(`Notification created for office ${office_id} for new project ${newProject.id}`);
      } catch (notificationError) {
        // مهم: لا تجعلي فشل إنشاء الإشعار يوقف العملية كلها
        // فقط سجلي الخطأ
        console.error('Failed to create notification for new project request:', notificationError);
      }
    }

    res.status(201).json(newProject);

  } catch (err) {
    console.error('Error creating initial project request:', err);
    // يمكنكِ إضافة معالجة أكثر تفصيلاً للأخطاء هنا (مثل SequelizeValidationError)
    res.status(500).json({ message: 'Failed to create initial project request.' });
  }
});


// =================================================================
// PUT /api/projects/:projectId/respond - لموافقة أو رفض المكتب لطلب المشروع
// =================================================================
router.put('/:projectId/respond', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
    const officeId = req.user.id; //  نفترض أن الـ ID الخاص بالمكتب موجود في req.user.id
    const officeName = req.user.name || 'The office'; // اسم المكتب من التوكن (لرسالة الإشعار)

    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can respond to project requests.' });
    }

    if (!action || (action.toLowerCase() !== 'approve' && action.toLowerCase() !== 'reject')) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject".' });
    }

    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] // لجلب معلومات المستخدم لإشعار الرفض/الموافقة
    });

    if (!project) {
      return res.status(404).json({ message: 'Project request not found.' });
    }

    // التأكد من أن المكتب الحالي هو المكتب المعني بالطلب
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to respond to this project request.' });
    }

    // التأكد من أن المشروع لا يزال في الحالة المناسبة للرد
    if (project.status !== 'Pending Office Approval') {
      return res.status(400).json({ message: `Cannot respond to project request. Current status: ${project.status}` });
    }

    let newStatus = '';
    let userNotificationType = '';
    let userNotificationMessage = '';

    if (action.toLowerCase() === 'approve') {
      newStatus = 'Office Approved - Awaiting Details'; // أو الحالة التي اتفقنا عليها
      userNotificationType = 'PROJECT_APPROVED_BY_OFFICE';
      userNotificationMessage = `Office '${officeName}' has approved your project request for '${project.name}'. You can now complete the project details.`;
      project.rejection_reason = null; // مسح سبب الرفض إذا كان موجوداً سابقاً (نظافة)
    } else { // action === 'reject'
      newStatus = 'Office Rejected';
      userNotificationType = 'PROJECT_REJECTED_BY_OFFICE';
      userNotificationMessage = `Office '${officeName}' has rejected your project request for '${project.name}'.`;
      if (rejection_reason) {
        userNotificationMessage += ` Reason: ${rejection_reason}`;
        project.rejection_reason = rejection_reason; //  افترض أن لديك عمود rejection_reason في جدول المشاريع (اختياري)
      }
    }

    project.status = newStatus;
    await project.save();

    // إرسال إشعار للمستخدم الأصلي (صاحب المشروع)
    if (project.user_id) { // تأكدي أن project.user_id موجود
      try {
        await Notification.create({
          recipient_id: project.user_id,
          recipient_type: 'individual', // أو 'user' حسب ما تستخدمينه
          actor_id: officeId,
          actor_type: 'office',
          notification_type: userNotificationType,
          message: userNotificationMessage,
          target_entity_id: project.id,
          target_entity_type: 'project',
        });
        console.log(`Notification sent to user ${project.user_id} for project ${project.id} status update.`);
      } catch (notificationError) {
        console.error('Failed to create notification for user about project response:', notificationError);
        // لا تجعلي فشل الإشعار يوقف العملية، لكن سجليه
      }
    }

    res.status(200).json({ message: `Project request ${action.toLowerCase()}ed successfully.`, project });

  } catch (error) {
    console.error('Error responding to project request:', error);
    res.status(500).json({ message: 'Failed to respond to project request.' });
  }
});


router.post('/:projectId/upload-agreement', authenticate, upload.single('agreementFile'), async (req, res) => {
  // 'agreementFile' هو اسم الحقل الذي سيرسله Flutter
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed.' });
    }

    const projectId = req.params.projectId;
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this project.' });
    }

    // مسار الملف النسبي (أو اسم الملف فقط إذا كان BASE_URL سيهتم بالباقي)
    const filePath = `uploads/agreements/${req.file.filename}`; 

    project.agreement_file = filePath;
    await project.save();

    res.json({ 
      message: 'Agreement file uploaded successfully.', 
      filePath: filePath, // أرجعي المسار ليستخدمه Flutter
      project: project // المشروع المحدث
    });

  } catch (error) {
    console.error('Error uploading agreement file:', error);
    if (error.message && error.message.includes('Only PDF files are allowed!')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') { 
        return res.status(400).json({ message: 'File too large. Max 20MB allowed.' });
    }
    res.status(500).json({ message: 'Failed to upload agreement file.' });
  }
});


router.put('/:projectId/submit-final-details', authenticate, async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id; // ID المستخدم من التوكن
    const userName = req.user.name || 'The User'; // اسم المستخدم من التوكن (لرسالة الإشعار)

    const project = await Project.findByPk(projectId, {
        include: [{ model: Office, as: 'office', attributes: ['id', 'name']}] // لجلب office_id واسم المكتب
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // 1. التحقق من ملكية المشروع
    if (project.user_id !== userId) {
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this project.' });
    }

    if (project.status !== 'Office Approved - Awaiting Details') { // أو الحالة المناسبة التي يكون فيها المستخدم يعبئ البيانات
      return res.status(400).json({ message: `Cannot submit final details. Project status is '${project.status}'. Required status is 'Office Approved - Awaiting Details'.` });
    }

    // 3. (اختياري) التحقق من أن ملف الاتفاقية تم رفعه بالفعل (أن حقل agreement_file في المشروع له قيمة)
    if (!project.agreement_file || project.agreement_file.trim() === '') {
       
        return res.status(400).json({ message: 'Agreement file has not been uploaded for this project yet.' });
    }
    

    // 4. تغيير حالة المشروع
    project.status = 'Details Submitted - Pending Office Review'; // أو 'Awaiting Payment Proposal by Office' أو حالة مناسبة
     // ✅✅✅  تحديث start_date إلى الوقت الحالي ✅✅✅
    // إذا لم يكن قد تم تعيينه من قبل، أو إذا أردتِ تحديثه دائماً عند هذه النقطة
    if (!project.start_date) { //  فقط إذا لم يكن معيناً من قبل
        project.start_date = new Date(); 
    }
  
    await project.save();

    // 5. إنشاء إشعار للمكتب
    if (project.office_id && project.office) { // تأكدي أن office_id واسم المكتب موجودان
      try {
        await Notification.create({
          recipient_id: project.office_id,
          recipient_type: 'office',
          actor_id: userId,
          actor_type: req.user.userType.toLowerCase(), // 'individual'
          notification_type: 'USER_SUBMITTED_PROJECT_DETAILS',
          message: `User '${userName}' has submitted the full details for project: '${project.name}'. Please review and propose payment.`,
          target_entity_id: project.id,
          target_entity_type: 'project',
        });
        console.log(`Notification created for office ${project.office_id} for project ${project.id} details submission.`);
      } catch (notificationError) {
        console.error('Failed to create notification for office about project details submission:', notificationError);
      }
    }

    // إرجاع المشروع المحدث (مع الحالة الجديدة)
    res.json({ message: 'Project details submitted successfully. Awaiting office review.', project });

  } catch (error) {
    console.error('Error submitting final project details:', error);
    res.status(500).json({ message: 'Failed to submit final project details.' });
  }
});


router.put('/byoffice/:id', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findByPk(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const currentUserId = req.user.id;
    const currentUserType = req.user.userType.toLowerCase();
    let canUpdate = false;
    const allowedUpdatesForUser = ['name', 'description', 'budget', 'location', 'land_area', 'plot_number', 'basin_number', 'land_location']; //  ما يمكن للمستخدم تعديله
    const allowedUpdatesForOffice = ['name', /* أي حقول أخرى يمكن للمكتب تعديلها */]; //  ما يمكن للمكتب تعديله

    const updateData = {};

    if (currentUserType === 'individual' && project.user_id === currentUserId) {
      // المستخدم المالك هو من يقوم بالتحديث
      const allowedStatesForUserEdit = ['Office Approved - Awaiting Details'];
      if (!allowedStatesForUserEdit.includes(project.status)) {
        return res.status(400).json({ message: `Project details cannot be updated by user in current status: '${project.status}'` });
      }
      for (const key of allowedUpdatesForUser) {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      }
      if (Object.keys(updateData).length > 0) canUpdate = true;

    } else if (currentUserType === 'office' && project.office_id === currentUserId) {
      // المكتب المعين هو من يقوم بالتحديث (مثلاً، تعديل الاسم)
      //  تحديد الحالات التي يمكن للمكتب فيها تعديل الاسم
      const allowedStatesForOfficeNameEdit = ['Pending Office Approval', 'Office Approved - Awaiting Details', 'Details Submitted - Pending Office Review', 'In Progress'];
       if (!allowedStatesForOfficeNameEdit.includes(project.status) && req.body.name) {
         return res.status(400).json({ message: `Project name cannot be updated by office in current status: '${project.status}'` });
       }
      for (const key of allowedUpdatesForOffice) {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      }
      if (Object.keys(updateData).length > 0) canUpdate = true;
    } else {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to update this project.' });
    }

    if (!canUpdate || Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided for update or update not permitted.' });
    }

    await project.update(updateData);

    const updatedProject = await Project.findByPk(projectId, {
        include: [
            { model: User, as: 'user', attributes: {exclude: ['password_hash']} },
            { model: Office, as: 'office' },
        ]
    });
    //  تنسيق الصور للمشروع المحدث
    const formattedProject = updatedProject.toJSON();
    const formatImagePath = (imagePath) => imagePath && !imagePath.startsWith('http') ? `${BASE_URL}/${imagePath.replace(/\\/g, '/')}` : imagePath;
    if (formattedProject.user) formattedProject.user.profile_image = formatImagePath(formattedProject.user.profile_image);
    if (formattedProject.office) formattedProject.office.profile_image = formatImagePath(formattedProject.office.profile_image);
    // ... (لباقي مسارات الملفات في formattedProject)

    res.json({ message: 'Project updated successfully.', project: formattedProject });

  } catch (err) {
    console.error('Error updating project:', err);
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Failed to update project.' });
  }
});

router.post('/:projectId/upload-license', authenticate, uploadLicense.single('licenseFile'), async (req, res) => {
  // 'licenseFile' هو اسم الحقل الذي سيرسله Flutter
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed.' });
    }
    const projectId = req.params.projectId;
    const project = await Project.findByPk(projectId);

    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (project.user_id !== req.user.id) { //  التحقق أن المستخدم هو مالك المشروع
      return res.status(403).json({ message: 'Forbidden: You are not the owner of this project.' });
    }
    //  يمكنك إضافة تحقق من حالة المشروع هنا إذا لزم الأمر
    //  if (project.status !== 'Office Approved - Awaiting Details') { ... }

    const filePath = `${req.file.destination.replace('uploads/', '')}${req.file.filename}`;
    project.license_file = filePath;
    await project.save();
    res.json({ message: 'License file uploaded successfully.', filePath, project });
  } catch (error) {
    console.error('Error uploading license file:', error);
    if (error.message && error.message.includes('Invalid file type')) return res.status(400).json({ message: error.message });
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large. Max 5MB.' });
    res.status(500).json({ message: 'Failed to upload license file.' });
  }
});


router.post('/:projectId/upload-architectural', authenticate, uploadArchitectural.single('architecturalFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded or file type not allowed.' });
    const projectId = req.params.projectId;
    const project = await Project.findByPk(projectId, { include: [{model: User, as: 'user', attributes:['id', 'name']}]});
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (req.user.userType.toLowerCase() !== 'office' || project.office_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Only the assigned office can upload this document.' });
    }
    //  تأكدي من حالة المشروع المناسبة لرفع هذا الملف
    //  if (!['In Progress', '...'].includes(project.status)) { ... }

    const filePath = `${req.file.destination.replace('uploads/', '')}${req.file.filename}`;
    project.architectural_file = filePath; //  الحقل الجديد
    await project.save();
    //  إرسال إشعار للمستخدم (اختياري هنا، أو يتم من خلال تحديث التقدم)
    // ... await Notification.create(...)
    res.json({ message: 'Architectural document uploaded successfully.', filePath, project });
  } catch (error) { /* ... معالجة الخطأ ... */ 
    console.error('Error uploading architectural file:', error);
    if (error.message && error.message.includes('Invalid file type')) return res.status(400).json({ message: error.message });
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large. Max 10MB.' });
    res.status(500).json({ message: 'Failed to upload architectural file.' });
  }
});

router.post('/:projectId/upload-final2d', authenticate, uploadFinal2D.single('final2dFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded or file type not allowed.' });
    const projectId = req.params.projectId;
    const project = await Project.findByPk(projectId, { include: [{model: User, as: 'user', attributes:['id', 'name']}]});
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (req.user.userType.toLowerCase() !== 'office' || project.office_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: Only the assigned office can upload this document.' });
    }
    
    const filePath = `${req.file.destination.replace('uploads/', '')}${req.file.filename}`;
    project.document_2d = filePath; //  تحديث حقل document_2d
    if (!project.end_date) { //  فقط إذا لم يكن معيناً من قبل
    project.end_date = new Date(); 
    project.status = 'Completed'; //  تحديث الحالة إلى 'Final 2D Uploaded' أو الحالة المناسبة
}
    await project.save();
    //  إرسال إشعار للمستخدم
     if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id, recipient_type: 'individual',
                actor_id: req.user.id, actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_FINAL_2D',
                message: `Office '${req.user.name || 'The Office'}' has uploaded the final 2D drawings for project '${project.name}'.`,
                target_entity_id: project.id, target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create final 2D upload notification", e); }
    }
    res.json({ message: 'Final 2D document uploaded successfully.', filePath, project });
  } catch (error) { /* ... معالجة الخطأ ... */ 
    console.error('Error uploading final 2D file:', error);
    if (error.message && error.message.includes('Invalid file type')) return res.status(400).json({ message: error.message });
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large. Max 10MB.' });
    res.status(500).json({ message: 'Failed to upload final 2D file.' });
  }
});

router.put('/:projectId/propose-payment', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { payment_amount, payment_notes } = req.body;
    
    // معلومات المكتب من التوكن
    const officeId = req.user.id; 
    const officeName = req.user.name || 'The Design Office'; //  اسم المكتب لرسالة الإشعار

    // 1. التحقق من أن المستخدم الحالي هو مكتب
    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can propose payment for a project.' });
    }

    // 2. التحقق من أن payment_amount صحيح
    if (payment_amount === undefined || payment_amount === null || isNaN(parseFloat(payment_amount)) || parseFloat(payment_amount) <= 0) {
      return res.status(400).json({ message: 'A valid positive payment_amount is required.' });
    }

    // 3. جلب المشروع والتحقق من وجوده ومن أن المكتب الحالي هو المكتب المعين
    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] // لجلب user_id و اسم المستخدم للإشعار
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office for this project.' });
    }

    // 4. التحقق من أن حالة المشروع تسمح باقتراح الدفع
    //    (مثلاً، بعد أن يرسل المستخدم كل تفاصيل المشروع)
    const allowedStatusForProposal = [
        'Details Submitted - Pending Office Review', //  الحالة التي يكون فيها المستخدم قد أرسل التفاصيل
        'Awaiting Payment Proposal by Office',
        'Payment Proposal Sent',
        'Under Office Supervision'
       
         //  قد تكون هذه حالة مخصصة
        // يمكنكِ إضافة حالات أخرى إذا لزم الأمر
    ]; 
    if (!allowedStatusForProposal.includes(project.status)) {
      return res.status(400).json({ 
        message: `Cannot propose payment at this stage. Project status is '${project.status}'. Required status: '${allowedStatusForProposal.join("' or '")}'.` 
      });
    }

    // 5. تحديث حقول المشروع
    project.proposed_payment_amount = parseFloat(payment_amount);
    project.payment_notes = payment_notes || null; //  إذا لم يتم إرسال ملاحظات، اجعلها null
    project.status = 'Payment Proposal Sent'; //  أو 'Awaiting User Payment'
    project.payment_status = 'Pending User Action'; //  أو 'Pending Payment'

    await project.save();

    // 6. إنشاء وإرسال إشعار للمستخدم مالك المشروع
    if (project.user_id && project.user) { // تأكد أن user_id و user (من include) موجودان
      try {
        await Notification.create({
          recipient_id: project.user_id,
          recipient_type: 'individual', //  أو 'user' حسب ما تستخدمينه لنوع المستخدم
          actor_id: officeId,
          actor_type: 'office',
          notification_type: 'OFFICE_PROPOSED_PAYMENT',
          message: `Office '${officeName}' has sent a payment proposal of ${currencyFormatForNotification(project.proposed_payment_amount)} for your project: '${project.name}'. ${project.payment_notes ? 'Notes: ' + project.payment_notes : ''}`,
          target_entity_id: project.id,
          target_entity_type: 'project',
        });
        console.log(`Notification sent to user ${project.user_id} regarding payment proposal for project ${project.id}.`);
      } catch (notificationError) {
        console.error('Failed to create payment proposal notification for user:', notificationError);
        //  لا توقف العملية بسبب فشل الإشعار، لكن سجل الخطأ
      }
    }

    // 7. إرجاع المشروع المحدث
    //  يمكنكِ إرجاع المشروع كاملاً مع تضمين user و office و projectDesign إذا أردتِ
    //  للتناسق مع GET /projects/:id
    const updatedProjectWithDetails = await Project.findByPk(projectId, {
        include: [
            { model: User, as: 'user', attributes: { exclude: ['password_hash'] } },
            { model: Office, as: 'office' },
            { model: ProjectDesign, as: 'projectDesign', required: false }
        ]
    });


    res.status(200).json({ 
      message: 'Payment proposal submitted successfully. User has been notified.', 
      project: updatedProjectWithDetails //  إرجاع المشروع المحدث بكل تفاصيله
    });

  } catch (error) {
    console.error('Error in /projects/:projectId/propose-payment route:', error);
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: "Validation Error", errors: error.errors.map(e => e.message)});
    }
    res.status(500).json({ message: 'Failed to submit payment proposal.' });
  }
});

//  دالة مساعدة لتنسيق العملة في رسالة الإشعار (يمكن وضعها في ملف helpers)
function currencyFormatForNotification(amount) {
    if (amount == null) return 'N/A';
    //  هذا تنسيق بسيط، يمكنكِ استخدام مكتبة إذا أردتِ تنسيقاً أكثر تعقيداً
    return `${amount.toFixed(2)} JOD`; 
}


router.put('/:projectId/progress', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { stage } = req.body; //  نتوقع stage كرقم (مثلاً 1 إلى 5)
    const officeId = req.user.id;
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can update project progress.' });
    }

    if (stage === undefined || stage === null || isNaN(parseInt(stage)) || parseInt(stage) < 0 /* أو 1 */ || parseInt(stage) > 5 /* عدد المراحل الكلي */) {
      return res.status(400).json({ message: 'Valid progress stage (e.g., 0-5) is required.' });
    }

    const project = await Project.findByPk(projectId, {
         include: [{model: User, as: 'user', attributes: ['id']}]
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }
    
    // يمكنكِ إضافة منطق هنا لمنع الرجوع لمرحلة سابقة إذا أردتِ
    // if (parseInt(stage) < project.progress_stage) {
    //   return res.status(400).json({ message: 'Cannot revert to a previous progress stage.' });
    // }


    project.progress_stage = parseInt(stage);
    // يمكنكِ هنا تحديث حالة المشروع الكلية (`project.status`) إذا كان الوصول لمرحلة معينة يعني اكتمال المشروع
    // مثلاً, إذا stage === 5 (آخر مرحلة)
    if (project.progress_stage === 5 && project.status !== 'Completed') {
       project.status = 'Completed'; //  أو 'Pending Final Delivery'
    }

    await project.save();

    //  إرسال إشعار للمستخدم بتحديث التقدم
    if (project.user_id) {
        // يمكنكِ جعل رسالة الإشعار أكثر تفصيلاً بناءً على رقم المرحلة
        let progressMessage = `Office '${officeName}' has updated the progress for your project '${project.name}' to stage ${project.progress_stage}.`;
        //  مثال لرسالة مخصصة:
        //  const stageLabels = ["Planning", "Design", "Review", "3D Modeling", "Delivery"];
        //  if (project.progress_stage > 0 && project.progress_stage <= stageLabels.length) {
        //      progressMessage = `Project '${project.name}' has entered the '${stageLabels[project.progress_stage - 1]}' stage.`;
        //  }

        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'PROJECT_PROGRESS_UPDATED',
                message: progressMessage,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create progress update notification", e); }
    }


    res.json({ message: 'Project progress updated successfully.', project });

  } catch (error) {
    console.error('Error updating project progress:', error);
    res.status(500).json({ message: 'Failed to update project progress.' });
  }
});



module.exports = router;


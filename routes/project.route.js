const express = require('express');
const router = express.Router();
const { ProjectDesign, Project, Notification,Review, User, Company, Office } = require('../models');
const authenticate = require('../middleware/authenticate');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const multer = require('multer');
const path = require('path');

const projectDocumentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/project_documents/2d/'); 
  },
  filename: function (req, file, cb) {
    const documentType = '2d'; 
    cb(null, `${req.params.projectId}-${documentType}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const projectDocumentFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/vnd.dwg', 'application/acad', 'application/zip', 'application/x-zip-compressed'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.log("Attempted to upload invalid file type for 2D document:", file.mimetype);
        cb(new Error('Invalid file type for 2D document. Allowed types: PDF, DWG, ZIP.'), false);
    }
};

const uploadProjectDocument = multer({ 
    storage: projectDocumentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: projectDocumentFileFilter
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/agreements/'); 
  },
  filename: function (req, file, cb) {
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB حد أقصى
    fileFilter: fileFilter
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
    const project = await Project.findByPk(req.params.id);
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

    // استبعاد الحقول التي لا يجب أن يغيرها المستخدم مباشرة من خلال هذا الـ endpoint
    // مثل user_id (يتم تعيينه عند الإنشاء), office_id (يتم تعيينه عند الإنشاء المبدئي), 
    // status (يتم تغييره من خلال عمليات أخرى مثل الموافقة/الرفض).
    // agreement_file (وغيرها من الملفات) سيتم تحديثها من خلال endpoint رفع الملفات.
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
    if (error.code === 'LIMIT_FILE_SIZE') { // خطأ من multer بسبب حجم الملف
        return res.status(400).json({ message: 'File too large. Max 5MB allowed.' });
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

    // 2. التحقق من أن حالة المشروع الحالية تسمح بهذا الإجراء
    //    (مثلاً، يجب أن يكون المكتب قد وافق مبدئياً)
    if (project.status !== 'Office Approved - Awaiting Details') { // أو الحالة المناسبة التي يكون فيها المستخدم يعبئ البيانات
      return res.status(400).json({ message: `Cannot submit final details. Project status is '${project.status}'. Required status is 'Office Approved - Awaiting Details'.` });
    }

    // 3. (اختياري) التحقق من أن ملف الاتفاقية تم رفعه بالفعل (أن حقل agreement_file في المشروع له قيمة)
    if (!project.agreement_file || project.agreement_file.trim() === '') {
        // ملاحظة: إذا كان API رفع الملفات هو الذي يحدث agreement_file، فهذا التحقق قد يكون مفيداً
        // إذا كان هذا الـ API هو الذي سيحدث agreement_file (بناءً على req.body)، فهذا التحقق ليس هنا مكانه
        // بناءً على تصميمنا، uploadProjectAgreement يحدث الحقل، لذا هذا التحقق جيد.
        return res.status(400).json({ message: 'Agreement file has not been uploaded for this project yet.' });
    }
    
    // (اختياري) إذا كنتِ سترسلين مسار الملف من Flutter وتحدثينه هنا مرة أخرى
    // (غير ضروري إذا كان API الرفع قد قام بذلك)
    // const { agreement_file_path } = req.body;
    // if (agreement_file_path) {
    //   project.agreement_file = agreement_file_path;
    // }


    // 4. تغيير حالة المشروع
    project.status = 'Details Submitted - Pending Office Review'; // أو 'Awaiting Payment Proposal by Office' أو حالة مناسبة
     // ✅✅✅  تحديث start_date إلى الوقت الحالي ✅✅✅
    // إذا لم يكن قد تم تعيينه من قبل، أو إذا أردتِ تحديثه دائماً عند هذه النقطة
    if (!project.start_date) { //  فقط إذا لم يكن معيناً من قبل
        project.start_date = new Date(); 
    }
    // أو إذا أردتِ تحديثه دائماً عند هذه الخطوة:
    // project.start_date = new Date(); 
    // اختاري السلوك الذي يناسبكِ. إذا كان المستخدم قد أدخل تاريخ بدء متوقع سابقاً،
    // قد لا ترغبين في الكتابة فوقه هنا. إذا كان هذا هو تاريخ البدء "الفعلي" للمرحلة التالية،
    // فقد يكون تحديثه دائماً مناسباً.
    // سأفترض حالياً أننا نحدثه فقط إذا لم يكن موجوداً.

    
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





// =======================
// GET /projects/:id — Get single project (مُعدَّل ليشمل كل التفاصيل)
// =======================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;
    const currentUserId = req.user.id;
    const currentUserType = req.user.userType.toLowerCase();

    const project = await Project.findByPk(projectId, {
      include: [
        { model: User, as: 'user', attributes: { exclude: ['password_hash'] } },
        { model: Office, as: 'office' },
        { model: Company, as: 'company', required: false },
        { model: ProjectDesign, as: 'projectDesign', required: false } 
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // التحقق من الصلاحية
    const isOwner = project.user_id === currentUserId && currentUserType === 'individual';
    const isAssignedOffice = project.office_id === currentUserId && currentUserType === 'office';
    //  يمكنكِ إضافة isAssignedCompany أو isAdmin إذا لزم الأمر

    if (!isOwner && !isAssignedOffice /* && !isAdmin */) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized to view this project.' });
    }
    
    const formattedProject = project.toJSON();
    // تعديل مسارات الصور للمرفقات (إذا احتجتِ لها كـ URLs كاملة)
    const formatImagePath = (imagePath) => {
        if (imagePath && !imagePath.startsWith('http')) {
            return `${BASE_URL}/${imagePath.replace(/\\/g, '/')}`;
        }
        return imagePath;
    };

    if (formattedProject.user) formattedProject.user.profile_image = formatImagePath(formattedProject.user.profile_image);
    if (formattedProject.office) formattedProject.office.profile_image = formatImagePath(formattedProject.office.profile_image);
    if (formattedProject.company) formattedProject.company.profile_image = formatImagePath(formattedProject.company.profile_image);
    
    // تعديل مسارات ملفات المشروع لتكون URLs كاملة
    formattedProject.license_file = formatImagePath(formattedProject.license_file);
    formattedProject.agreement_file = formatImagePath(formattedProject.agreement_file);
    formattedProject.document_2d = formatImagePath(formattedProject.document_2d);
    formattedProject.document_3d = formatImagePath(formattedProject.document_3d);


    res.json(formattedProject);
  } catch (err) {
    console.error('Error fetching project details:', err);
    res.status(500).json({ message: 'Failed to fetch project details' });
  }
});



// =====================================================================
//  PUT /api/projects/:projectId/propose-payment (جديد)
//  - للمكتب لاقتراح سعر للمشروع
// =====================================================================
router.put('/:projectId/propose-payment', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { payment_amount, payment_notes } = req.body;
    const officeId = req.user.id;
    const officeName = req.user.name || 'The Office';

    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can propose payment.' });
    }

    if (payment_amount === undefined || payment_amount === null || isNaN(parseFloat(payment_amount)) || parseFloat(payment_amount) <= 0) {
      return res.status(400).json({ message: 'Valid payment_amount is required.' });
    }

    const project = await Project.findByPk(projectId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] //  لجلب user_id و اسم المستخدم
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office for this project.' });
    }
    
    //  تحديد الحالات التي يمكن للمكتب فيها اقتراح سعر
    const allowedStatusForProposal = ['Details Submitted - Pending Office Review', 'Awaiting Payment Proposal by Office'];
    if (!allowedStatusForProposal.includes(project.status)) {
      return res.status(400).json({ message: `Cannot propose payment. Project status is '${project.status}'.` });
    }

    project.proposed_payment_amount = parseFloat(payment_amount);
    project.payment_notes = payment_notes || null;
    project.status = 'Payment Proposal Sent'; // أو 'Awaiting User Payment'
    project.payment_status = 'Pending User Action'; // أو 'Pending'
    
    await project.save();

    // إرسال إشعار للمستخدم
    if (project.user_id) {
      try {
        await Notification.create({
          recipient_id: project.user_id,
          recipient_type: 'individual', //  تأكدي أن هذا يطابق userType في توكن المستخدم
          actor_id: officeId,
          actor_type: 'office',
          notification_type: 'OFFICE_PROPOSED_PAYMENT',
          message: `Office '${officeName}' has proposed a payment of ${payment_amount} JOD for your project: '${project.name}'.`,
          target_entity_id: project.id,
          target_entity_type: 'project',
        });
      } catch (notificationError) {
        console.error('Failed to create payment proposal notification:', notificationError);
      }
    }

    res.json({ message: 'Payment proposal submitted successfully.', project });

  } catch (error) {
    console.error('Error proposing payment:', error);
    res.status(500).json({ message: 'Failed to propose payment.' });
  }
});


// =====================================================================
// POST /api/projects/:projectId/upload-document2d (جديد)
//  - للمكتب لرفع ملف 2D
// =====================================================================
router.post('/:projectId/upload-document2d', authenticate, uploadProjectDocument.single('document2dFile'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const officeId = req.user.id; // المكتب الحالي
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload project documents.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed by filter.' });
    }

    const project = await Project.findByPk(projectId, {
        include: [{model: User, as: 'user', attributes: ['id']}] // لجلب user_id لإرسال الإشعار
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }

    const filePath = `uploads/project_documents/2d/${req.file.filename}`;
    project.document_2d = filePath; //  تحديث حقل المشروع
    await project.save();

    //  إرسال إشعار للمستخدم
    if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_2D_DOCUMENT',
                message: `Office '${officeName}' has uploaded the 2D documents for your project: '${project.name}'.`,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create 2D upload notification", e); }
    }


    res.json({ 
      message: '2D document uploaded successfully.', 
      filePath: filePath, //  مسار الملف على السيرفر
      project: project 
    });

  } catch (error) {
    console.error('Error uploading 2D document:', error);
    // إذا كان الخطأ من multer بسبب نوع الملف (من fileFilter)
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large.' });
    }
    res.status(500).json({ message: 'Failed to upload 2D document.' });
  }
});


router.post('/:projectId/upload-document3d', authenticate, uploadProjectDocument.single('document3dFile'), async (req, res) => {
  // 'document3dFile' هو اسم الحقل الذي سيرسله Flutter
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const officeId = req.user.id; // المكتب الحالي
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload project documents.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed by filter.' });
    }

    const project = await Project.findByPk(projectId, {
        include: [{model: User, as: 'user', attributes: ['id']}] // لجلب user_id لإرسال الإشعار
    });
    if (!project) {
      //  إذا لم يتم العثور على المشروع، قد تحتاجين لحذف الملف الذي تم رفعه (أو تركه)
      // fs.unlinkSync(req.file.path); //  مثال لحذف الملف (يتطلب import fs)
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      // fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }

    const filePath = `uploads/project_documents/3d/${req.file.filename}`;
    project.document_3d = filePath; //  تحديث حقل المشروع
    await project.save();

    //  إرسال إشعار للمستخدم
    if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_3D_DOCUMENT',
                message: `Office '${officeName}' has uploaded the 3D documents for your project: '${project.name}'.`,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create 3D upload notification", e); }
    }


    res.json({ 
      message: '3D document uploaded successfully.', 
      filePath: filePath, //  مسار الملف على السيرفر
      project: project 
    });

  } catch (error) {
    console.error('Error uploading 3D document:', error);
    // إذا كان الخطأ من multer بسبب نوع الملف (من fileFilter)
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large.' });
    }
    res.status(500).json({ message: 'Failed to upload 3D document.' });
  }
});

router.post('/:projectId/upload-document1', authenticate, uploadProjectDocument.single('document1File'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const officeId = req.user.id; // المكتب الحالي
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload project documents.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed by filter.' });
    }

    const project = await Project.findByPk(projectId, {
        include: [{model: User, as: 'user', attributes: ['id']}] // لجلب user_id لإرسال الإشعار
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }

    const filePath = `uploads/project_documents/1/${req.file.filename}`;
    project.document_1 = filePath; //  تحديث حقل المشروع
    await project.save();

    //  إرسال إشعار للمستخدم
    if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_1_DOCUMENT',
                message: `Office '${officeName}' has uploaded the 1st documents for your project: '${project.name}'.`,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create 1st upload notification", e); }
    }


    res.json({ 
      message: '1st document uploaded successfully.', 
      filePath: filePath, //  مسار الملف على السيرفر
      project: project 
    });

  } catch (error) {
    console.error('Error uploading 1st document:', error);
    // إذا كان الخطأ من multer بسبب نوع الملف (من fileFilter)
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large.' });
    }
    res.status(500).json({ message: 'Failed to upload 1st document.' });
  }
});

router.post('/:projectId/upload-document2', authenticate, uploadProjectDocument.single('document2File'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const officeId = req.user.id; // المكتب الحالي
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload project documents.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed by filter.' });
    }

    const project = await Project.findByPk(projectId, {
        include: [{model: User, as: 'user', attributes: ['id']}] // لجلب user_id لإرسال الإشعار
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }

    const filePath = `uploads/project_documents/2/${req.file.filename}`;
    project.document_2  = filePath; //  تحديث حقل المشروع
    await project.save();

    //  إرسال إشعار للمستخدم
    if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_2_DOCUMENT',
                message: `Office '${officeName}' has uploaded the 2nd documents for your project: '${project.name}'.`,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create 1st upload notification", e); }
    }


    res.json({ 
      message: '2nd document uploaded successfully.', 
      filePath: filePath, //  مسار الملف على السيرفر
      project: project 
    });

  } catch (error) {
    console.error('Error uploading 2nd document:', error);
    // إذا كان الخطأ من multer بسبب نوع الملف (من fileFilter)
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large.' });
    }
    res.status(500).json({ message: 'Failed to upload 2nd document.' });
  }
});


router.post('/:projectId/upload-document3', authenticate, uploadProjectDocument.single('document3File'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const officeId = req.user.id; // المكتب الحالي
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload project documents.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed by filter.' });
    }

    const project = await Project.findByPk(projectId, {
        include: [{model: User, as: 'user', attributes: ['id']}] // لجلب user_id لإرسال الإشعار
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }

    const filePath = `uploads/project_documents/3/${req.file.filename}`;
    project.document_3 = filePath; //  تحديث حقل المشروع
    await project.save();

    //  إرسال إشعار للمستخدم
    if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_3_DOCUMENT',
                message: `Office '${officeName}' has uploaded the 3rd documents for your project: '${project.name}'.`,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create 3rd upload notification", e); }
    }


    res.json({ 
      message: '3rd document uploaded successfully.', 
      filePath: filePath, //  مسار الملف على السيرفر
      project: project 
    });

  } catch (error) {
    console.error('Error uploading 3rd document:', error);
    // إذا كان الخطأ من multer بسبب نوع الملف (من fileFilter)
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large.' });
    }
    res.status(500).json({ message: 'Failed to upload 3rd document.' });
  }
});

router.post('/:projectId/upload-document4', authenticate, uploadProjectDocument.single('document4File'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const officeId = req.user.id; // المكتب الحالي
    const officeName = req.user.name || 'The Office';


    if (req.user.userType.toLowerCase() !== 'office') {
      return res.status(403).json({ message: 'Forbidden: Only offices can upload project documents.' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or file type not allowed by filter.' });
    }

    const project = await Project.findByPk(projectId, {
        include: [{model: User, as: 'user', attributes: ['id']}] // لجلب user_id لإرسال الإشعار
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    if (project.office_id !== officeId) {
      return res.status(403).json({ message: 'Forbidden: You are not the assigned office.' });
    }

    const filePath = `uploads/project_documents/4/${req.file.filename}`;
    project.document_4  = filePath; //  تحديث حقل المشروع
    await project.save();

    //  إرسال إشعار للمستخدم
    if (project.user_id) {
        try {
            await Notification.create({
                recipient_id: project.user_id,
                recipient_type: 'individual',
                actor_id: officeId,
                actor_type: 'office',
                notification_type: 'OFFICE_UPLOADED_4_DOCUMENT',
                message: `Office '${officeName}' has uploaded the 4th documents for your project: '${project.name}'.`,
                target_entity_id: project.id,
                target_entity_type: 'project',
            });
        } catch (e) { console.error("Failed to create 4th upload notification", e); }
    }


    res.json({ 
      message: '4th document uploaded successfully.', 
      filePath: filePath, //  مسار الملف على السيرفر
      project: project 
    });

  } catch (error) {
    console.error('Error uploading 4th document:', error);
    // إذا كان الخطأ من multer بسبب نوع الملف (من fileFilter)
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large.' });
    }
    res.status(500).json({ message: 'Failed to upload 4th document.' });
  }
});
// =====================================================================
// PUT /api/projects/:projectId/progress (جديد)
//  - للمكتب لتحديث مرحلة تقدم المشروع
// =====================================================================
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
    // if (project.progress_stage === 5 && project.status !== 'Completed') {
    //    project.status = 'Completed'; //  أو 'Pending Final Delivery'
    // }

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

const express = require('express');
const router = express.Router();
const { Project, Notification,Review, User, Company, Office } = require('../models');
const authenticate = require('../middleware/authenticate');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

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

module.exports = router;


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

module.exports = router;

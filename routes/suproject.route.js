// routes/project.route.js
const express = require('express');
const router = express.Router();
// تأكدي من استيراد كل الموديلات اللازمة
const { Project, User, Office, Company, Notification, ProjectDesign } = require('../models'); 
const authenticate = require('../middleware/authenticate');
const path = require('path'); //  إذا كنتِ لا تزالين تحتاجينه لـ multer
const multer = require('multer'); //  إذا كنتِ لا تزالين تحتاجينه لـ multer
const fs = require('fs'); //  إذا كنتِ لا تزالين تحتاجينه لـ multer

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';



// =====================================================================
// ✅✅✅  ROUTE جديد: المستخدم يطلب إشرافاً على مشروع قائم  ✅✅✅
// POST /api/projects/:projectId/request-supervision
// =====================================================================
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
            { model: Office, as: 'designOffice', required: false }, //  المكتب المصمم
            { model: Office, as: 'supervisingOffice', required: false }, //  المكتب المشرف
            { model: Company, as: 'assignedCompany', required: false },
            { model: ProjectDesign, as: 'projectDesign', required: false }
        ]
    });
    res.status(200).json({ message: 'Supervision request sent successfully.', project: updatedProject });

  } catch (error) {
    console.error('Error requesting project supervision:', error);
    res.status(500).json({ message: 'Failed to request project supervision.' });
  }
});


// =====================================================================
// ✅✅✅  ROUTE جديد: المكتب يوافق أو يرفض طلب الإشراف  ✅✅✅
// PUT /api/projects/:projectId/respond-supervision
// =====================================================================
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
            { model: Office, as: 'designOffice', required: false },
            { model: Office, as: 'supervisingOffice', required: false },
            { model: Company, as: 'assignedCompany', required: false },
            { model: ProjectDesign, as: 'projectDesign', required: false }
        ]
    });
    res.status(200).json({ message: `Supervision request ${action.toLowerCase()}ed successfully.`, project: updatedProject });

  } catch (error) {
    console.error('Error responding to supervision request:', error);
    res.status(500).json({ message: 'Failed to respond to supervision request.' });
  }
});


module.exports = router;
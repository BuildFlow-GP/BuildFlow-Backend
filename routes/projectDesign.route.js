// routes/project_designs.route.js
const express = require('express');
const router = express.Router();
const { ProjectDesign, Project } = require('../models'); 
const authenticate = require('../middleware/authenticate'); //  
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
// POST /api/project-designs/:projectId - إنشاء أو تحديث تفاصيل التصميم
// سنستخدم POST للإنشاء و PUT للتحديث، أو POST واحد يقوم بـ upsert (إنشاء إذا لم يكن موجوداً، تحديث إذا كان موجوداً)
// Upsert هو الأسهل إذا كان لكل مشروع تصميم واحد فقط.

router.post('/:projectId', authenticate, async (req, res) => { 
  const projectId = parseInt(req.params.projectId, 10);
  const userIdFromToken = req.user.id; 

  const {
    floor_count, bedrooms, bathrooms, kitchens, balconies,
    special_rooms, directional_rooms, kitchen_type, master_has_bathroom,
    general_description, interior_design, room_distribution,
    budget_min, budget_max 
  } = req.body;

  try {
    // 1. التحقق من أن المشروع موجود وينتمي للمستخدم الحالي
    const project = await Project.findOne({ where: { id: projectId, user_id: userIdFromToken } });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or you are not authorized.' });
    }

    // 2. التحقق من أن حالة المشروع تسمح بإضافة/تعديل تفاصيل التصميم
    //    (مثلاً، بعد موافقة المكتب وقبل الـ Submit النهائي من DesignAgreementScreen)
    if (project.status !== 'Details Submitted - Pending Office Review' /* && project.status !== '...' */) {
        // يمكنكِ تعديل هذا الشرط ليشمل الحالات الأخرى التي يمكن فيها تعديل تفاصيل التصميم
        return res.status(400).json({ error: `Cannot add/update design details for project in status: ${project.status}` });
    }


    // 3. Upsert: إنشاء إذا لم يكن موجوداً، أو تحديث إذا كان موجوداً
    // هذا يفترض أن لكل مشروع سجل تصميم واحد فقط في project_designs
    const [design, created] = await ProjectDesign.upsert({
      project_id: projectId, //  مهم جداً للربط ولشرط الـ upsert
      floor_count, bedrooms, bathrooms, kitchens, balconies,
      special_rooms, directional_rooms, kitchen_type, master_has_bathroom,
      general_description, interior_design, room_distribution,
      budget_min, budget_max // ✅ الحقول الجديدة
    }, {
      // returning: true, //  قد لا يعمل returning مع upsert في كل قواعد البيانات بنفس الطريقة
      // where: { project_id: projectId } //  شرط الـ upsert (عادةً يكون على المفتاح الأساسي أو الفريد)
      //  Sequelize upsert يعتمد على المفتاح الأساسي. إذا لم يكن project_id مفتاحاً أساسياً أو فريداً،
      //  قد تحتاجين لعمل findOne ثم create أو update.
      //  بما أن العلاقة هي 1-to-1 (مشروع واحد له تصميم واحد)، يمكننا عمل findOrCreate أو findOneAndUpdate
    });
    
    // إذا لم يرجع upsert الكائن المحدث، يمكنكِ جلبه مرة أخرى
    // أو الاعتماد على أن الـ upsert قام بالعملية.
    // للحصول على الكائن المحدث/المنشأ بشكل موثوق:
    const resultDesign = await ProjectDesign.findOne({ where: { project_id: projectId } });


    if (created) {
      res.status(201).json({ message: 'Project design details created.', design: resultDesign });
    } else {
      res.status(200).json({ message: 'Project design details updated.', design: resultDesign });
    }

  } catch (err) {
    console.error('Error creating/updating project design:', err);
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: 'Validation Error', details: err.errors.map(e => e.message) });
    }
    res.status(500).json({ error: 'Server error while processing project design.' });
  }
});

// GET /api/project-designs/:projectId - جلب تفاصيل التصميم
router.get('/:projectId', authenticate, async (req, res) => { // ✅ إضافة authenticate (اختياري، حسب من يمكنه الرؤية)
  const projectId = parseInt(req.params.projectId, 10);
  const userIdFromToken = req.user.id; // إذا أردتِ التحقق من الملكية هنا أيضاً

  try {
    // يمكنكِ إضافة تحقق هنا إذا كان المستخدم الحالي هو مالك المشروع أو المكتب المرتبط به
    // قبل السماح برؤية تفاصيل التصميم.
    // const project = await Project.findOne({ where: { id: projectId } });
    // if (!project || (project.user_id !== userIdFromToken && project.office_id !== userIdFromToken /*إذا كان المكتب له نفس id المستخدم*/ )) {
    //    return res.status(403).json({ error: "Not authorized to view this design." });
    // }


    const design = await ProjectDesign.findOne({
      where: { project_id: projectId }
    });

    if (!design) {
      // لا يعتبر خطأ إذا لم يكن هناك تفاصيل تصميم مدخلة بعد، يمكن إرجاع 200 مع null أو كائن فارغ
      // أو 404 إذا كنتِ تعتبرين أنه يجب أن يكون موجوداً
      return res.status(200).json(null); //  إرجاع null إذا لم يتم العثور على تصميم
      // return res.status(404).json({ message: 'Design details not found for this project yet.' });
    }

    res.json(design);
  } catch (err) {
    console.error('Error fetching project design:', err);
    res.status(500).json({ error: 'Server error while fetching project design.' });
  }
});

module.exports = router;
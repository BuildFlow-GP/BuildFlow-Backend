// ملف جديد: routes/document.route.js (أو أضيفيه لملف موجود)
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs'); //  مكتبة نظام الملفات
const authenticate = require('../middleware/authenticate'); //  إذا أردتِ حماية الوصول للملفات

//  المسار الأساسي لمجلد الرفع
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads'); //  يفترض أن uploads بجانب مجلد routes

//  ================================================================
//  GET /api/documents/*  -  لخدمة (إرسال) أي ملف من مجلد uploads
//  مثال للـ URL المطلوب: /api/documents/agreements/21/agreement-123.pdf
//  ================================================================
  router.get('/:filePath(*)', authenticate, async (req, res) => {
  const requestedFilePathRelative = req.params.filePath;
  try {
    if (!requestedFilePathRelative) {
      return res.status(400).json({ message: 'File path is required.' });
    }

    //  تكوين المسار الكامل للملف على السيرفر
    const absoluteFilePath = path.join(UPLOADS_DIR, requestedFilePathRelative);

    //  (مهم للأمان) التأكد من أن المسار المطلوب لا يزال داخل مجلد UPLOADS_DIR
    //  لمنع هجمات Path Traversal (مثل ../../etc/passwd)
    const resolvedPath = path.resolve(absoluteFilePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
        console.warn(`Attempted path traversal: ${requestedFilePathRelative}`);
        return res.status(403).json({ message: 'Forbidden: Access to this path is not allowed.' });
    }


    // التحقق من وجود الملف
    if (fs.existsSync(absoluteFilePath)) {
      //  هنا يجب التحقق من صلاحيات المستخدم للوصول لهذا الملف بالتحديد
      //  هذا الجزء يعتمد على منطق عملك.
      //  مثال: هل المستخدم الحالي هو مالك المشروع المرتبط بهذا الملف؟
      //  أو هل هو المكتب المعين؟
      //  لنفترض الآن أن authenticate كافٍ مبدئياً، أو أن الملفات عامة للمستخدمين المسجلين.
      //  إذا احتجتِ لمنطق صلاحيات أكثر تفصيلاً، يجب إضافته هنا.
      //  مثلاً، إذا كان اسم الملف يتضمن projectId، يمكنكِ استخراجه والتحقق.

      //  إرسال الملف
      res.sendFile(absoluteFilePath, (err) => {
        if (err) {
          console.error(`Error sending file ${absoluteFilePath}:`, err);
          //  لا ترسلي رسالة خطأ إذا كان الـ header قد أُرسل بالفعل
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error sending file.' });
          }
        } else {
          console.log(`Successfully sent file: ${absoluteFilePath}`);
        }
      });
    } else {
      console.warn(`File not found at: ${absoluteFilePath} (requested: ${requestedFilePathRelative})`);
      res.status(404).json({ message: 'File not found.' });
    }
  } catch (error) {
    console.error('Error in file serving route:', error);
    res.status(500).json({ message: 'Server error while trying to serve the file.' });
  }
});

module.exports = router;
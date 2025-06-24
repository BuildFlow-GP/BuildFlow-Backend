// routes/document.route.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/authenticate');
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');


// ================================================================
// GET /api/archdocument  -  لخدمة ملف PDF واحد ثابت
// ================================================================
router.get('/archdocument', /* authenticate, */ async (req, res) => {
  try {
    //  اسم الملف الثابت ومساره النسبي داخل مجلد uploads
    const fixedRelativePath = 'project_documents/architecturalFile.pdf'; //  عدلي هذا ليعكس مسار ملفك الفعلي
                                                              //  مثال: إذا كان الملف مباشرة داخل uploads،
                                                              //  سيكون فقط 'test-document.pdf'
                                                              //  إذا كان في uploads/project_files/20/agreements/my.pdf
                                                              //  سيكون 'project_files/20/agreements/my.pdf'

    const absoluteFilePath = path.join(UPLOADS_DIR, fixedRelativePath);

    console.log(`Attempting to open file: ${absoluteFilePath}`); //  للتأكد من المسار

    // التحقق من وجود الملف
    if (fs.existsSync(absoluteFilePath)) {
      //  إرسال الملف
      res.sendFile(absoluteFilePath, (err) => {
        if (err) {
          console.error(`Error sending file ${absoluteFilePath}:`, err);
          if (!res.headersSent) {
            res.status(err.status || 500).json({ message: 'Error sending file.' });
          }
        } else {
          console.log(`Successfully sent file: ${absoluteFilePath}`);
        }
      });
    } else {
      console.warn(`File not found at: ${absoluteFilePath}`);
      res.status(404).json({ message: 'PDF file not found.' });
    }
  } catch (error) {
    console.error('Error in file serving route:', error);
    res.status(500).json({ message: 'Server error while trying to serve the file.' });
  }
});


router.get('/agreementdocument', /* authenticate, */ async (req, res) => {
  try {
    //  اسم الملف الثابت ومساره النسبي داخل مجلد uploads
    const fixedRelativePath = 'agreements/agreementFile.pdf'; 
    const absoluteFilePath = path.join(UPLOADS_DIR, fixedRelativePath);

    console.log(`Attempting to open file: ${absoluteFilePath}`); //  للتأكد من المسار

    // التحقق من وجود الملف
    if (fs.existsSync(absoluteFilePath)) {
      //  إرسال الملف
      res.sendFile(absoluteFilePath, (err) => {
        if (err) {
          console.error(`Error sending file ${absoluteFilePath}:`, err);
          if (!res.headersSent) {
            res.status(err.status || 500).json({ message: 'Error sending file.' });
          }
        } else {
          console.log(`Successfully sent file: ${absoluteFilePath}`);
        }
      });
    } else {
      console.warn(`File not found at: ${absoluteFilePath}`);
      res.status(404).json({ message: 'PDF file not found.' });
    }
  } catch (error) {
    console.error('Error in file serving route:', error);
    res.status(500).json({ message: 'Server error while trying to serve the file.' });
  }
});

router.get('/2ddocument', /* authenticate, */ async (req, res) => {
  try {
    //  اسم الملف الثابت ومساره النسبي داخل مجلد uploads
    const fixedRelativePath = '2d/final2dFile.pdf'; 
    const absoluteFilePath = path.join(UPLOADS_DIR, fixedRelativePath);

    console.log(`Attempting to open file: ${absoluteFilePath}`); //  للتأكد من المسار

    // التحقق من وجود الملف
    if (fs.existsSync(absoluteFilePath)) {
      //  إرسال الملف
      res.sendFile(absoluteFilePath, (err) => {
        if (err) {
          console.error(`Error sending file ${absoluteFilePath}:`, err);
          if (!res.headersSent) {
            res.status(err.status || 500).json({ message: 'Error sending file.' });
          }
        } else {
          console.log(`Successfully sent file: ${absoluteFilePath}`);
        }
      });
    } else {
      console.warn(`File not found at: ${absoluteFilePath}`);
      res.status(404).json({ message: 'PDF file not found.' });
    }
  } catch (error) {
    console.error('Error in file serving route:', error);
    res.status(500).json({ message: 'Server error while trying to serve the file.' });
  }
});


//  إذا كنتِ قد أضفتِ الـ wildcard route سابقاً، علقيه مؤقتاً أثناء هذا الاختبار
// router.get('/*', authenticate, async (req, res) => { /* ... */ });


// ================================================================
// GET /*  -  لخدمة (إرسال) أي ملف من مجLD uploads
//  إذا تم ربط هذا الـ router بـ /api/documents في index.js،
//  فإن /api/documents/agreements/21/file.pdf سيجعل req.params[0] يحتوي على
//  "agreements/21/file.pdf"
// ================================================================
// router.get('/*', authenticate, async (req, res) => { //  ✅✅✅  التغيير هنا: '/*'  ✅✅✅
//   try {
//     const requestedFilePathRelative = req.params[0]; //  ✅  الوصول للمسار الملتقط

//     if (!requestedFilePathRelative || requestedFilePathRelative.trim() === '') { //  تحقق إضافي
//       return res.status(400).json({ message: 'File path is required.' });
//     }

//     //  (اختياري ولكن جيد) تنظيف المسار من أي ".." محتملة في البداية أو أحرف غريبة
//     //  هذا للحماية الإضافية، مع أن التحقق اللاحق بـ startsWith هو الأهم
//     const cleanRelativePath = path.normalize(requestedFilePathRelative).replace(/^(\.\.[/\\])+/, '');

//     const absoluteFilePath = path.join(UPLOADS_DIR, cleanRelativePath);
//     const resolvedPath = path.resolve(absoluteFilePath);

//     // التحقق من Path Traversal
//     if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
//         console.warn(`Forbidden path access attempt: '${requestedFilePathRelative}' resolved to '${resolvedPath}' which is outside UPLOADS_DIR '${path.resolve(UPLOADS_DIR)}'`);
//         return res.status(403).json({ message: 'Forbidden: Access to this path is not allowed.' });
//     }

//     if (fs.existsSync(absoluteFilePath)) {
//       //  TODO: إضافة منطق صلاحيات أكثر تفصيلاً هنا إذا لزم الأمر
//       //  (مثلاً، التحقق إذا كان المستخدم الحالي هو مالك المشروع المرتبط بالملف)
      
//       //  تحديد Content-Type بناءً على امتداد الملف (اختياري، res.sendFile عادةً ما يفعله)
//       // const contentType = mime.getType(absoluteFilePath); //  يتطلب import mime
//       // if (contentType) {
//       //   res.setHeader('Content-Type', contentType);
//       // }

//       res.sendFile(absoluteFilePath, (err) => {
//         if (err) {
//           console.error(`Error sending file ${absoluteFilePath}:`, err);
//           if (!res.headersSent) {
//             res.status(err.status || 500).json({ message: 'Error sending file.' });
//           }
//         } else {
//           console.log(`Successfully sent file: ${absoluteFilePath}`);
//         }
//       });
//     } else {
//       console.warn(`File not found at: ${absoluteFilePath} (requested: ${requestedFilePathRelative})`);
//       res.status(404).json({ message: 'File not found.' });
//     }
//   } catch (error) {
//     console.error('Error in file serving route:', error);
//     res.status(500).json({ message: 'Server error while trying to serve the file.' });
//   }
// });

module.exports = router;
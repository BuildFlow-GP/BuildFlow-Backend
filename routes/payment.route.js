const braintree = require("braintree");
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Project, Notification, Review, User, Company, Office, ProjectDesign } = require('../models');

const authenticate = require('../middleware/authenticate'); 


const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox, //  أو Production عند الإطلاق
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
});

router.get('/client-token', authenticate, async (req, res) => {
  try {
    const response = await gateway.clientToken.generate({
      // يمكنكِ تمرير customerId هنا إذا كان المستخدم مسجلاً كـ customer في Braintree Vault
      // customerId: req.user.braintreeCustomerId 
    });
    res.send({ clientToken: response.clientToken });
  } catch (err) {
    console.error("Error generating Braintree client token:", err);
    res.status(500).send({ error: "Failed to generate client token" });
  }
});

router.post('/checkout', authenticate, async (req, res) => {
  const { paymentMethodNonce, amount, projectId } = req.body;
  const userId = req.user.id;

  if (!paymentMethodNonce || !amount || !projectId) {
    return res.status(400).json({ error: "Missing payment nonce, amount, or project ID." });
  }

  try {
    const project = await Project.findByPk(projectId);
    if (!project || project.user_id !== userId) {
        return res.status(404).json({ error: "Project not found or not authorized." });
    }
    //  تأكدي أن حالة المشروع تسمح بالدفع وأن المبلغ صحيح
    if (project.status !== 'Payment Proposal Sent' && project.status !== 'Awaiting User Payment') { //  أو ما يعادلها
        return res.status(400).json({ error: `Payment cannot be processed for project in status: ${project.status}` });
    }
    if (project.proposed_payment_amount !== parseFloat(amount)) {
        return res.status(400).json({ error: "Payment amount does not match the proposed amount." });
    }


    const result = await gateway.transaction.sale({
      amount: amount.toString(), //  يجب أن يكون string
      paymentMethodNonce: paymentMethodNonce,
      // يمكنكِ إضافة orderId, customerId, shipping/billing details هنا إذا أردتِ
      options: {
        submitForSettlement: true //  لإجراء الدفع مباشرة
      }
    });

    if (result.success) {
      console.log('Transaction ID: ' + result.transaction.id);
      // ✅ نجح الدفع
      // 1. تحديث حالة المشروع وحالة الدفع في قاعدة البيانات
      project.status = 'In Progress'; //  أو حالة مناسبة بعد الدفع
      project.payment_status = 'Paid';
      project.transaction_id = result.transaction.id; //  (اختياري) حفظ معرف المعاملة
      await project.save();

      // 2. (اختياري) إرسال إشعار للمكتب بأن الدفع تم
      // ... Notification.create(...) ...

      res.status(200).json({ 
        success: true, 
        message: 'Payment successful!', 
        transactionId: result.transaction.id,
        project: project //  إرجاع المشروع المحدث
      });
    } else {
      // فشل الدفع
      console.error('Braintree Payment Error:', result.message);
      //  يمكنكِ تحليل result.errors لمزيد من التفاصيل
      res.status(400).json({ 
        success: false, 
        message: `Payment failed: ${result.message}`, 
        errors: result.errors ? result.errors.deepErrors() : [] 
      });
    }
  } catch (err) {
    console.error("Error processing Braintree transaction:", err);
    res.status(500).send({ error: "Failed to process payment" });
  }
});

module.exports = router; 

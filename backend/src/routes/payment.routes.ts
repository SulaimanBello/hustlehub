import { Router } from 'express';
import { handleWebhook, verifyPayment } from '../controllers/payment.controller';

const router = Router();

// Webhook endpoint (public - no auth, verified by signature)
router.post('/webhook', handleWebhook);

// Verify payment (can be protected or public depending on requirements)
router.post('/verify/:transaction_id', verifyPayment);

export default router;

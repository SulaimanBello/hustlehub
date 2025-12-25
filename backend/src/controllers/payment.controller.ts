import { Request, Response } from 'express';
import { flutterwaveService, PaymentService } from '../services/payment.service';
import { AppError, FlutterwaveWebhookPayload } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * POST /payments/webhook
 * Handle Flutterwave webhook callbacks
 *
 * IMPORTANT: This endpoint must be publicly accessible (no auth)
 * Security is handled through webhook signature verification
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['verif-hash'] as string;

  if (!signature) {
    throw new AppError(400, 'Missing webhook signature');
  }

  // Verify webhook signature
  const payload = JSON.stringify(req.body);
  const isValid = flutterwaveService.verifyWebhookSignature(payload, signature);

  if (!isValid) {
    console.error('❌ Invalid webhook signature');
    throw new AppError(401, 'Invalid webhook signature');
  }

  const webhookData: FlutterwaveWebhookPayload = req.body;

  // Process webhook asynchronously
  PaymentService.handleWebhook(webhookData.event, webhookData.data)
    .catch((error) => {
      console.error('❌ Webhook processing error:', error);
    });

  // Respond immediately to Flutterwave
  res.status(200).json({ status: 'success' });
});

/**
 * POST /payments/verify/:transaction_id
 * Manually verify a payment (admin or debugging)
 */
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { transaction_id } = req.params;

  const verification = await flutterwaveService.verifyPayment(transaction_id);

  res.status(200).json({
    success: true,
    data: verification,
  });
});

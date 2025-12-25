import axios from 'axios';
import crypto from 'crypto';
import config from '../config';
import {
  TransactionModel,
  WalletModel,
  TaskModel,
} from '../models';
import {
  FlutterwaveChargeRequest,
  FlutterwaveTransferRequest,
  TransactionType,
  TransactionStatus,
  TaskStatus,
} from '../types';

/**
 * Flutterwave Payment Service
 * Handles escrow payments and mobile money payouts
 *
 * CRITICAL: This is the most important service in the MVP
 * All money movement must be auditable and reliable
 */

const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

class FlutterwaveService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = config.flutterwave.secretKey;
    this.publicKey = config.flutterwave.publicKey;
  }

  /**
   * Make authenticated request to Flutterwave API
   */
  private async request<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${FLUTTERWAVE_BASE_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'Flutterwave API error');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Flutterwave API error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Initialize payment for task escrow
   * Returns payment link for user to complete payment
   */
  async initializeTaskPayment(
    taskId: string,
    amount: number,
    userPhone: string,
    userName: string
  ): Promise<{ payment_link: string; tx_ref: string }> {
    const tx_ref = `task_${taskId}_${Date.now()}`;

    const payload: FlutterwaveChargeRequest = {
      tx_ref,
      amount,
      currency: 'NGN',
      customer: {
        email: `${userPhone}@hustlehub.app`, // Construct email from phone
        phone_number: userPhone,
        name: userName || 'HustleHub User',
      },
      customizations: {
        title: 'HustleHub Task Payment',
        description: `Escrow payment for task ${taskId}`,
      },
    };

    const response = await this.request<any>('POST', '/payments', payload);

    console.log('💳 Payment initialized:', tx_ref);

    return {
      payment_link: response.data.link,
      tx_ref,
    };
  }

  /**
   * Verify payment status
   */
  async verifyPayment(transactionId: string): Promise<any> {
    const response = await this.request('GET', `/transactions/${transactionId}/verify`);

    console.log('🔍 Payment verified:', transactionId, response.data.status);

    return response.data;
  }

  /**
   * Initiate transfer (payout) to user's mobile money
   */
  async initiateTransfer(
    accountNumber: string,
    bankCode: string,
    amount: number,
    reference: string,
    narration: string,
    beneficiaryName: string
  ): Promise<string> {
    const payload: FlutterwaveTransferRequest = {
      account_bank: bankCode,
      account_number: accountNumber,
      amount,
      currency: 'NGN',
      reference,
      narration,
      beneficiary_name: beneficiaryName,
    };

    const response = await this.request<any>('POST', '/transfers', payload);

    console.log('💸 Transfer initiated:', response.data.id);

    return response.data.id; // Flutterwave transfer ID
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!config.flutterwave.webhookSecret) {
      console.warn('⚠️ Webhook secret not configured, skipping verification');
      return true; // Allow in development
    }

    const hash = crypto
      .createHmac('sha256', config.flutterwave.webhookSecret)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }
}

export const flutterwaveService = new FlutterwaveService();

/**
 * Business logic for task payment flow
 */
export const PaymentService = {
  /**
   * Create escrow hold for task
   * Called when task is created
   */
  async createEscrowHold(
    taskId: string,
    posterId: string,
    amount: number
  ): Promise<{ payment_link: string; transaction_id: string }> {
    // Get poster's wallet
    const wallet = await WalletModel.findByUserId(posterId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Create pending transaction record
    const transaction = await TransactionModel.create({
      wallet_id: wallet.id,
      task_id: taskId,
      type: TransactionType.ESCROW_HOLD,
      amount,
      status: TransactionStatus.PENDING,
    });

    // TODO: Initialize Flutterwave payment
    // For MVP, we'll simulate this
    // In production:
    // const payment = await flutterwaveService.initializeTaskPayment(...);

    console.log(`💰 Escrow hold created for task ${taskId}: ${amount}`);

    return {
      payment_link: 'https://example.com/payment', // Would be real Flutterwave link
      transaction_id: transaction.id,
    };
  },

  /**
   * Release escrow payment to doer
   * Called when poster confirms task completion
   */
  async releaseEscrowPayment(taskId: string): Promise<void> {
    const task = await TaskModel.findById(taskId);

    if (!task || !task.doer_id) {
      throw new Error('Invalid task or doer not assigned');
    }

    if (task.status !== TaskStatus.COMPLETED) {
      throw new Error('Task must be in COMPLETED status');
    }

    // Calculate amounts
    const platformFeePercent = config.business.platformFeePercent;
    const platformFee = (task.fee_amount * platformFeePercent) / 100;
    const doerAmount = task.fee_amount - platformFee;

    // Get doer's wallet
    const doerWallet = await WalletModel.findByUserId(task.doer_id);

    if (!doerWallet) {
      throw new Error('Doer wallet not found');
    }

    // Create platform fee transaction
    const posterWallet = await WalletModel.findByUserId(task.poster_id);
    if (posterWallet) {
      await TransactionModel.create({
        wallet_id: posterWallet.id,
        task_id: taskId,
        type: TransactionType.PLATFORM_FEE,
        amount: platformFee,
        platform_fee: platformFee,
        status: TransactionStatus.COMPLETED,
        metadata: {
          original_amount: task.fee_amount,
          fee_percent: platformFeePercent,
        },
      });
    }

    // Create escrow release transaction for doer
    const releaseTransaction = await TransactionModel.create({
      wallet_id: doerWallet.id,
      task_id: taskId,
      type: TransactionType.ESCROW_RELEASE,
      amount: doerAmount,
      platform_fee: platformFee,
      status: TransactionStatus.PENDING,
    });

    // TODO: Initiate Flutterwave transfer to doer
    // For MVP, mark as completed immediately
    // In production:
    // await flutterwaveService.initiateTransfer(...);

    // Mark transaction as completed (this will trigger wallet balance update)
    await TransactionModel.updateStatus(releaseTransaction.id, TransactionStatus.COMPLETED);

    // Mark task as paid
    await TaskModel.markPaid(taskId);

    console.log(`✅ Payment released for task ${taskId}: ${doerAmount} (fee: ${platformFee})`);
  },

  /**
   * Handle Flutterwave webhook events
   */
  async handleWebhook(event: string, data: any): Promise<void> {
    console.log('📨 Webhook received:', event);

    switch (event) {
      case 'charge.completed':
        await this.handlePaymentCompleted(data);
        break;

      case 'transfer.completed':
        await this.handleTransferCompleted(data);
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', event);
    }
  },

  /**
   * Handle payment completion webhook
   */
  async handlePaymentCompleted(data: any): Promise<void> {
    const { tx_ref, status, amount } = data;

    if (status !== 'successful') {
      console.warn('⚠️ Payment not successful:', status);
      return;
    }

    // Extract task ID from tx_ref (format: task_{taskId}_{timestamp})
    const taskIdMatch = tx_ref.match(/^task_([a-f0-9-]+)_/);

    if (!taskIdMatch) {
      console.error('❌ Invalid tx_ref format:', tx_ref);
      return;
    }

    const taskId = taskIdMatch[1];

    // Find and update transaction
    const transactions = await TransactionModel.findByTask(taskId);
    const escrowTransaction = transactions.find(
      (t) => t.type === TransactionType.ESCROW_HOLD && t.status === TransactionStatus.PENDING
    );

    if (escrowTransaction) {
      await TransactionModel.updateStatus(
        escrowTransaction.id,
        TransactionStatus.COMPLETED,
        data.flw_ref
      );

      console.log(`✅ Escrow payment confirmed for task ${taskId}`);
    }
  },

  /**
   * Handle transfer completion webhook
   */
  async handleTransferCompleted(data: any): Promise<void> {
    const { reference, status } = data;

    if (status !== 'successful') {
      console.warn('⚠️ Transfer not successful:', status);
      return;
    }

    // Find transaction by reference
    // Update status based on webhook confirmation

    console.log(`✅ Transfer completed: ${reference}`);
  },
};

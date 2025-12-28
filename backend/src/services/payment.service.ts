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
      throw new Error('Webhook secret not configured - cannot verify webhook authenticity');
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
  ): Promise<{ payment_link: string; transaction_id: string; tx_ref: string }> {
    // Get poster's wallet and user details
    const wallet = await WalletModel.findByUserId(posterId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get poster details for payment initialization
    const { UserModel } = await import('../models');
    const poster = await UserModel.findById(posterId);

    if (!poster) {
      throw new Error('User not found');
    }

    // Initialize Flutterwave payment
    const payment = await flutterwaveService.initializeTaskPayment(
      taskId,
      amount,
      poster.phone_number,
      poster.name || 'HustleHub User'
    );

    // Create pending transaction record with Flutterwave reference
    const transaction = await TransactionModel.create({
      wallet_id: wallet.id,
      task_id: taskId,
      type: TransactionType.ESCROW_HOLD,
      amount,
      status: TransactionStatus.PENDING,
      metadata: {
        tx_ref: payment.tx_ref,
        payment_link: payment.payment_link,
      },
    });

    console.log(`💰 Escrow payment initialized for task ${taskId}: ${amount} NGN`);
    console.log(`🔗 Payment link: ${payment.payment_link}`);

    return {
      payment_link: payment.payment_link,
      transaction_id: transaction.id,
      tx_ref: payment.tx_ref,
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
    // This credits the doer's wallet balance (internal ledger)
    // Actual bank transfer happens when doer requests withdrawal
    const releaseTransaction = await TransactionModel.create({
      wallet_id: doerWallet.id,
      task_id: taskId,
      type: TransactionType.ESCROW_RELEASE,
      amount: doerAmount,
      platform_fee: platformFee,
      status: TransactionStatus.PENDING,
    });

    // Mark transaction as completed (this will trigger wallet balance update via DB trigger)
    // No Flutterwave transfer needed here - money is held in platform account
    // Transfer happens when user withdraws via processWithdrawal()
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

    // Extract transaction ID from reference (format: withdrawal_{transactionId}_{timestamp})
    const txIdMatch = reference.match(/^withdrawal_([a-f0-9-]+)_/);

    if (!txIdMatch) {
      console.error('❌ Invalid withdrawal reference format:', reference);
      return;
    }

    const transactionId = txIdMatch[1];
    const transaction = await TransactionModel.findById(transactionId);

    if (!transaction) {
      console.error('❌ Transaction not found:', transactionId);
      return;
    }

    if (transaction.type !== TransactionType.WITHDRAWAL) {
      console.error('❌ Transaction is not a withdrawal:', transactionId);
      return;
    }

    if (status !== 'successful') {
      console.warn('⚠️ Transfer not successful:', status);
      await TransactionModel.updateStatus(transactionId, TransactionStatus.FAILED);
      console.error(`❌ Withdrawal failed: ${reference}`);
      return;
    }

    // Mark withdrawal as completed (this will trigger wallet balance update)
    await TransactionModel.updateStatus(transactionId, TransactionStatus.COMPLETED, data.id?.toString());
    console.log(`✅ Withdrawal completed: ${reference} (${transaction.amount} NGN)`);
  },

  /**
   * Refund escrow payment when task is cancelled
   * Only possible if task hasn't been accepted yet
   */
  async refundEscrowPayment(taskId: string): Promise<void> {
    const task = await TaskModel.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== TaskStatus.CANCELLED) {
      throw new Error('Task must be in CANCELLED status for refund');
    }

    // Find the escrow hold transaction
    const transactions = await TransactionModel.findByTask(taskId);
    const escrowTransaction = transactions.find(
      (t) => t.type === TransactionType.ESCROW_HOLD
    );

    if (!escrowTransaction) {
      console.warn(`⚠️ No escrow transaction found for cancelled task ${taskId}`);
      return;
    }

    if (escrowTransaction.status === TransactionStatus.PENDING) {
      // Payment was never completed, just mark as failed
      await TransactionModel.updateStatus(escrowTransaction.id, TransactionStatus.FAILED);
      console.log(`📋 Escrow payment marked as failed for cancelled task ${taskId}`);
    } else if (escrowTransaction.status === TransactionStatus.COMPLETED) {
      // Payment was completed, would need to process refund via Flutterwave
      // For MVP, we can credit the wallet back
      const wallet = await WalletModel.findByUserId(task.poster_id);

      if (wallet) {
        // Create a refund transaction (effectively cancels out the escrow hold)
        await TransactionModel.create({
          wallet_id: wallet.id,
          task_id: taskId,
          type: TransactionType.ESCROW_RELEASE,
          amount: task.fee_amount,
          status: TransactionStatus.COMPLETED,
          metadata: {
            refund: true,
            original_transaction: escrowTransaction.id,
          },
        });

        console.log(`💵 Refund processed for cancelled task ${taskId}: ${task.fee_amount} NGN`);
      }
    }
  },

  /**
   * Process pending withdrawal
   * Called by admin or automated process to transfer funds
   */
  async processWithdrawal(transactionId: string): Promise<void> {
    const transaction = await TransactionModel.findById(transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.type !== TransactionType.WITHDRAWAL) {
      throw new Error('Transaction is not a withdrawal');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error(`Transaction is not pending (current status: ${transaction.status})`);
    }

    // Get wallet to verify balance
    const wallet = await WalletModel.findById(transaction.wallet_id);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify sufficient balance (withdrawal amount is stored as negative)
    const withdrawalAmount = Math.abs(transaction.amount);
    if (wallet.balance < withdrawalAmount) {
      await TransactionModel.updateStatus(transactionId, TransactionStatus.FAILED);
      throw new Error('Insufficient balance for withdrawal');
    }

    // Get bank account details from metadata
    const { account_number, bank_code } = transaction.metadata || {};

    if (!account_number || !bank_code) {
      throw new Error('Missing bank account details in transaction metadata');
    }

    // Get user details for beneficiary name
    const { UserModel } = await import('../models');
    const user = await UserModel.findById(wallet.user_id);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate unique reference for this withdrawal
    const reference = `withdrawal_${transactionId}_${Date.now()}`;

    try {
      // Initiate Flutterwave transfer
      const transferId = await flutterwaveService.initiateTransfer(
        account_number,
        bank_code,
        withdrawalAmount,
        reference,
        `HustleHub withdrawal for ${user.phone_number}`,
        user.name || 'HustleHub User'
      );

      // Update transaction with Flutterwave reference
      await TransactionModel.updateStatus(
        transactionId,
        TransactionStatus.PENDING, // Keep as PENDING until webhook confirms
        transferId
      );

      // Store reference in metadata for webhook matching
      const updatedMetadata = {
        ...transaction.metadata,
        withdrawal_reference: reference,
        flutterwave_transfer_id: transferId,
      };

      // Note: We'd need to add a method to update metadata
      // For now, this will be handled by the webhook

      console.log(`💸 Withdrawal transfer initiated: ${withdrawalAmount} NGN to ${account_number}`);
      console.log(`🔗 Flutterwave transfer ID: ${transferId}`);
    } catch (error: any) {
      // Mark transaction as failed
      await TransactionModel.updateStatus(transactionId, TransactionStatus.FAILED);
      console.error(`❌ Withdrawal failed:`, error.message);
      throw error;
    }
  },
};

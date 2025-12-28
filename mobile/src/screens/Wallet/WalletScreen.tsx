import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  metadata?: any;
}

interface Wallet {
  balance: number;
  total_earned: number;
  total_spent: number;
  total_withdrawn: number;
}

export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchWalletData();
    }, [])
  );

  const fetchWalletData = async () => {
    try {
      setIsLoading(true);
      const [walletResponse, transactionsResponse] = await Promise.all([
        api.getWallet(),
        api.getTransactions(),
      ]);

      setWallet(walletResponse.data.wallet);
      setTransactions(transactionsResponse.data.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWalletData();
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!accountNumber || accountNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid account number');
      return;
    }

    if (!bankCode) {
      Alert.alert('Error', 'Please enter a bank code');
      return;
    }

    if (wallet && amount > wallet.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsProcessing(true);
      await api.requestWithdrawal({
        amount,
        account_number: accountNumber,
        bank_code: bankCode,
      });

      Alert.alert(
        'Withdrawal Requested',
        'Your withdrawal request is being processed. This may take a few minutes.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowWithdrawModal(false);
              setWithdrawAmount('');
              setAccountNumber('');
              setBankCode('');
              fetchWalletData();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to process withdrawal'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ESCROW_HOLD':
        return '🔒';
      case 'ESCROW_RELEASE':
        return '💰';
      case 'TASK_PAYMENT':
        return '💸';
      case 'WITHDRAWAL':
        return '🏦';
      case 'REFUND':
        return '🔄';
      default:
        return '📝';
    }
  };

  const getTransactionColor = (type: string) => {
    if (type === 'ESCROW_HOLD' || type === 'TASK_PAYMENT' || type === 'WITHDRAWAL') {
      return '#F44336';
    }
    return '#4CAF50';
  };

  const getTransactionSign = (type: string) => {
    if (type === 'ESCROW_HOLD' || type === 'TASK_PAYMENT' || type === 'WITHDRAWAL') {
      return '-';
    }
    return '+';
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        <Text style={styles.iconText}>{getTransactionIcon(item.type)}</Text>
      </View>

      <View style={styles.transactionDetails}>
        <Text style={styles.transactionType}>
          {item.type.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleDateString()} •{' '}
          {item.status}
        </Text>
      </View>

      <Text
        style={[
          styles.transactionAmount,
          { color: getTransactionColor(item.type) },
        ]}
      >
        {getTransactionSign(item.type)}₦{item.amount.toLocaleString()}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>
          ₦{wallet?.balance.toLocaleString() || '0'}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Earned</Text>
            <Text style={styles.statValue}>
              ₦{wallet?.total_earned.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValue}>
              ₦{wallet?.total_spent.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Withdrawn</Text>
            <Text style={styles.statValue}>
              ₦{wallet?.total_withdrawn.toLocaleString() || '0'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.withdrawButton}
          onPress={() => setShowWithdrawModal(true)}
          disabled={!wallet || wallet.balance <= 0}
        >
          <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <View style={styles.transactionsSection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#4CAF50']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      </View>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>

            <Text style={styles.modalLabel}>Amount (₦)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Account Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1234567890"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              maxLength={10}
            />

            <Text style={styles.modalLabel}>Bank Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 058 for GTBank"
              value={bankCode}
              onChangeText={setBankCode}
              keyboardType="numeric"
              maxLength={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowWithdrawModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleWithdraw}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Withdraw</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: '#4CAF50',
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  withdrawButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsSection: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

type TaskDetailRouteProp = RouteProp<MainStackParamList, 'TaskDetail'>;
type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  fee_amount: number;
  status: string;
  poster_id: string;
  doer_id: string | null;
  distance?: number;
  created_at: string;
}

export default function TaskDetailScreen() {
  const route = useRoute<TaskDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { taskId } = route.params;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.getTaskById(taskId);
      setTask(response.data.task);
    } catch (error) {
      console.error('Error fetching task details:', error);
      Alert.alert('Error', 'Failed to load task details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTask = async () => {
    if (!task) return;

    Alert.alert(
      'Accept Task',
      `Are you sure you want to accept this task for ₦${task.fee_amount.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await api.acceptTask(taskId);
              Alert.alert('Success', 'Task accepted! You can now start working on it.');
              fetchTaskDetails(); // Refresh to show updated state
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to accept task');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteTask = async () => {
    Alert.alert(
      'Mark Complete',
      'Have you finished this task? This will notify the poster.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await api.completeTask(taskId);
              Alert.alert('Success', 'Task marked as complete. Waiting for confirmation.');
              fetchTaskDetails();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to complete task');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirm Completion',
      'Confirm that this task is complete? Payment will be released to the doer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await api.confirmTask(taskId);
              Alert.alert('Success', 'Payment released! Task is complete.');
              fetchTaskDetails();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to confirm completion');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelTask = async () => {
    Alert.alert(
      'Cancel Task',
      'Are you sure you want to cancel this task? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await api.cancelTask(taskId);
              Alert.alert('Success', 'Task cancelled');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to cancel task');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'POSTED':
        return '#4CAF50';
      case 'ACCEPTED':
        return '#FF9800';
      case 'COMPLETED':
        return '#2196F3';
      case 'PAID':
        return '#9C27B0';
      case 'CANCELLED':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const renderActionButtons = () => {
    if (!task || !user) return null;

    const isPostedByMe = task.poster_id === user.id;
    const isAcceptedByMe = task.doer_id === user.id;

    // Poster can cancel if not yet paid
    if (isPostedByMe && task.status !== 'PAID' && task.status !== 'CANCELLED') {
      return (
        <>
          {task.status === 'COMPLETED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleConfirmCompletion}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? 'Processing...' : 'Confirm & Release Payment'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleCancelTask}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>Cancel Task</Text>
          </TouchableOpacity>
        </>
      );
    }

    // Doer can accept or complete
    if (!isPostedByMe) {
      if (task.status === 'POSTED') {
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleAcceptTask}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>
              {isProcessing ? 'Processing...' : 'Accept Task'}
            </Text>
          </TouchableOpacity>
        );
      }

      if (task.status === 'ACCEPTED' && isAcceptedByMe) {
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleCompleteTask}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>
              {isProcessing ? 'Processing...' : 'Mark as Complete'}
            </Text>
          </TouchableOpacity>
        );
      }
    }

    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Task not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{task.title}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}
          >
            <Text style={styles.statusText}>{task.status}</Text>
          </View>
        </View>

        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Task Fee</Text>
          <Text style={styles.feeAmount}>₦{task.fee_amount.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {task.description || 'No description provided'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.locationText}>
          📍 {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
        </Text>
        {task.distance && (
          <Text style={styles.distanceText}>
            {task.distance.toFixed(1)}km from your location
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Posted:</Text>
          <Text style={styles.detailValue}>
            {new Date(task.created_at).toLocaleDateString()}
          </Text>
        </View>
        {task.doer_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accepted by:</Text>
            <Text style={styles.detailValue}>Doer</Text>
          </View>
        )}
      </View>

      <View style={styles.actionContainer}>{renderActionButtons()}</View>

      {/* Chat Button - Show if user is involved in the task */}
      {user && (task.poster_id === user.id || task.doer_id === user.id) && (
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => {
            navigation.navigate('Chat', {
              taskId: task.id,
              taskTitle: task.title,
            });
          }}
        >
          <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>
            💬 Open Chat
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feeLabel: {
    fontSize: 16,
    color: '#666',
  },
  feeAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#999',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionContainer: {
    padding: 20,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    margin: 20,
    marginTop: 0,
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

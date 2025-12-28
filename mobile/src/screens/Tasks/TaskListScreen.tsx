import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/AppNavigator';
import api from '../../services/api';

interface Task {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  fee_amount: number;
  status: string;
  distance?: number;
  created_at: string;
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type FilterType = 'all' | 'posted' | 'accepted';

export default function TaskListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useFocusEffect(
    React.useCallback(() => {
      fetchTasks();
    }, [filter])
  );

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      let response;

      if (filter === 'posted') {
        response = await api.getMyPostedTasks();
      } else if (filter === 'accepted') {
        response = await api.getMyAcceptedTasks();
      } else {
        // For "all", get current location and fetch nearby
        response = await api.getNearbyTasks(6.5244, 3.3792, 10); // Default Lagos
      }

      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTasks();
  };

  const handleTaskPress = (taskId: string) => {
    navigation.navigate('TaskDetail', { taskId });
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
      default:
        return '#757575';
    }
  };

  const renderTaskCard = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => handleTaskPress(item.id)}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.taskDescription} numberOfLines={2}>
        {item.description || 'No description provided'}
      </Text>

      <View style={styles.taskFooter}>
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Fee:</Text>
          <Text style={styles.feeAmount}>₦{item.fee_amount.toLocaleString()}</Text>
        </View>
        {item.distance && (
          <Text style={styles.distance}>{item.distance.toFixed(1)}km away</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {filter === 'posted' && '📝 No tasks posted yet'}
        {filter === 'accepted' && '✋ No tasks accepted yet'}
        {filter === 'all' && '🔍 No tasks found nearby'}
      </Text>
      <Text style={styles.emptySubtext}>
        {filter === 'all' && 'Try posting a new task!'}
        {filter === 'posted' && 'Post your first task to get started'}
        {filter === 'accepted' && 'Accept a task from the map to start earning'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[styles.filterText, filter === 'all' && styles.activeFilterText]}
          >
            All Tasks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'posted' && styles.activeFilterTab]}
          onPress={() => setFilter('posted')}
        >
          <Text
            style={[styles.filterText, filter === 'posted' && styles.activeFilterText]}
          >
            My Posted
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'accepted' && styles.activeFilterTab]}
          onPress={() => setFilter('accepted')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'accepted' && styles.activeFilterText,
            ]}
          >
            My Accepted
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#4CAF50']}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  distance: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

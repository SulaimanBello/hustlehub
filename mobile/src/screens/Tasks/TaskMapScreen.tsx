import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
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
}

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function TaskMapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [region, setRegion] = useState<Region>({
    latitude: 6.5244, // Default to Lagos, Nigeria
    longitude: 3.3792,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearbyTasks();
    }
  }, [location]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to find nearby tasks',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);
      setRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
      setIsLoading(false);
    }
  };

  const fetchNearbyTasks = async () => {
    if (!location) return;

    try {
      setIsLoading(true);
      const response = await api.getNearbyTasks(
        location.coords.latitude,
        location.coords.longitude,
        5 // 5km radius
      );

      setTasks(response.data.tasks || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to load nearby tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkerPress = (taskId: string) => {
    navigation.navigate('TaskDetail', { taskId });
  };

  const handleCreateTask = () => {
    navigation.navigate('CreateTask');
  };

  const handleRefresh = () => {
    fetchNearbyTasks();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading nearby tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {tasks.map((task) => (
          <Marker
            key={task.id}
            coordinate={{
              latitude: task.latitude,
              longitude: task.longitude,
            }}
            title={task.title}
            description={`₦${task.fee_amount.toLocaleString()} • ${task.distance?.toFixed(1)}km away`}
            onPress={() => handleMarkerPress(task.id)}
            pinColor={task.status === 'POSTED' ? '#4CAF50' : '#FFA726'}
          />
        ))}
      </MapView>

      {/* Task Count Badge */}
      <View style={styles.taskCountBadge}>
        <Text style={styles.taskCountText}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} nearby
        </Text>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleRefresh}
      >
        <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
      </TouchableOpacity>

      {/* Create Task Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateTask}
      >
        <Text style={styles.createButtonText}>+ Post Task</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  taskCountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  createButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

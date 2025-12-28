import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/AppNavigator';
import api from '../../services/api';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const PLATFORM_FEE_PERCENT = 15;

export default function CreateTaskScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to post a task'
        );
        setIsLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleMapPress = (event: any) => {
    setLocation({
      latitude: event.nativeEvent.coordinate.latitude,
      longitude: event.nativeEvent.coordinate.longitude,
    });
  };

  const calculatePlatformFee = () => {
    const fee = parseFloat(feeAmount) || 0;
    return (fee * PLATFORM_FEE_PERCENT) / 100;
  };

  const calculateTotal = () => {
    const fee = parseFloat(feeAmount) || 0;
    return fee + calculatePlatformFee();
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a task title');
      return false;
    }

    if (title.length > 200) {
      Alert.alert('Validation Error', 'Title must be less than 200 characters');
      return false;
    }

    const fee = parseFloat(feeAmount);
    if (!fee || fee <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid fee amount');
      return false;
    }

    if (fee > 1000000) {
      Alert.alert('Validation Error', 'Fee amount cannot exceed ₦1,000,000');
      return false;
    }

    if (!location) {
      Alert.alert('Validation Error', 'Please select a location for the task');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !location) return;

    try {
      setIsSubmitting(true);

      const response = await api.createTask({
        title: title.trim(),
        description: description.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        fee_amount: parseFloat(feeAmount),
      });

      const { task, payment } = response.data;

      // Show success message
      Alert.alert(
        'Task Created!',
        `Your task has been created. Please complete payment to activate it.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // In a real app, you would open the payment link in a WebView or browser
              // For now, just navigate back
              console.log('Payment Link:', payment.payment_link);
              Alert.alert(
                'Payment Required',
                'In production, this would open Flutterwave payment. For now, the task is created.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating task:', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to create task'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Task Details</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Help me move furniture"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Provide more details about the task..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />

          <Text style={styles.label}>Fee Amount (₦) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={feeAmount}
            onChangeText={setFeeAmount}
            keyboardType="numeric"
          />

          {parseFloat(feeAmount) > 0 && (
            <View style={styles.feeBreakdown}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Task Fee:</Text>
                <Text style={styles.feeValue}>
                  ₦{parseFloat(feeAmount).toLocaleString()}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>
                  Platform Fee ({PLATFORM_FEE_PERCENT}%):
                </Text>
                <Text style={styles.feeValue}>
                  ₦{calculatePlatformFee().toLocaleString()}
                </Text>
              </View>
              <View style={[styles.feeRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total to Pay:</Text>
                <Text style={styles.totalValue}>
                  ₦{calculateTotal().toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Map Section */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Task Location *</Text>
          <Text style={styles.mapHint}>
            Tap on the map to adjust the task location
          </Text>

          {location && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={location}
                title="Task Location"
                draggable
                onDragEnd={handleMapPress}
              />
            </MapView>
          )}

          {location && (
            <Text style={styles.coordinates}>
              📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Create Task & Pay ₦{calculateTotal().toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your payment will be held in escrow until the task is completed and
          confirmed.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  feeBreakdown: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
  },
  feeValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  mapSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 20,
  },
  mapHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  map: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coordinates: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: -12,
  },
});

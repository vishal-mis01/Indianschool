import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, useWindowDimensions } from "react-native";
import { Button, TextInput, Surface, Card, Title, Paragraph, Chip, Menu } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import apiFetch from "./apiFetch";

export default function UserTravelForm({ onBack }) {
  const [startingKms, setStartingKms] = useState("");
  const [endingKms, setEndingKms] = useState("");
  const [selectedKmField, setSelectedKmField] = useState("ending");
  const [kmMenuVisible, setKmMenuVisible] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const { width } = useWindowDimensions();

  // Generate ending kms options (starting from 0 to 1000 kms)
  const endingKmsOptions = Array.from({ length: 101 }, (_, i) => i * 10); // 0, 10, 20, ..., 1000

  // Get current location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationPermissionDenied(false);

      // Always request location permissions (this will prompt user even if previously denied)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        Alert.alert(
          'Location Permission Required',
          'Location permission is required to submit travel records. Please grant permission to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => {
                // Recursively try again
                setTimeout(() => getCurrentLocation(), 500);
              }
            }
          ]
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Failed to get current location. Please check your GPS settings and try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const openCamera = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const capturedPhoto = result.assets[0];
        const timestamp = new Date().toISOString();

        // Add metadata to photo
        const photoWithMetadata = {
          ...capturedPhoto,
          timestamp,
          location: currentLocation,
        };

        setPhoto(photoWithMetadata);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Camera Error', 'Failed to open camera. Please try again.');
    }
  };

  const validateForm = () => {
    if (!startingKms.trim()) {
      Alert.alert('Validation Error', 'Please enter starting kilometers.');
      return false;
    }

    if (!endingKms) {
      Alert.alert('Validation Error', 'Please select ending kilometers.');
      return false;
    }

    if (!photo) {
      Alert.alert('Validation Error', 'Please take a photo.');
      return false;
    }

    if (!currentLocation) {
      Alert.alert('Validation Error', 'Current location is required. Please enable location services.');
      return false;
    }

    const startKms = parseFloat(startingKms);
    const endKms = parseFloat(endingKms);

    if (isNaN(startKms) || startKms < 0) {
      Alert.alert('Validation Error', 'Starting kilometers must be a valid positive number.');
      return false;
    }

    if (isNaN(endKms) || endKms < 0) {
      Alert.alert('Validation Error', 'Ending kilometers must be a valid positive number.');
      return false;
    }

    if (endKms <= startKms) {
      Alert.alert('Validation Error', 'Ending kilometers must be greater than starting kilometers.');
      return false;
    }

    return true;
  };

  const submitTravelForm = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const formData = new FormData();

      // Add basic travel data
      formData.append('starting_kms', startingKms.trim());
      formData.append('ending_kms', endingKms);
      formData.append('total_kms', (parseFloat(endingKms) - parseFloat(startingKms)).toString());

      // Add location data
      if (currentLocation) {
        formData.append('latitude', currentLocation.latitude.toString());
        formData.append('longitude', currentLocation.longitude.toString());
        formData.append('location_accuracy', currentLocation.accuracy?.toString() || '0');
        formData.append('location_timestamp', currentLocation.timestamp);
      }

      // Add photo
      if (photo) {
        formData.append('photo', {
          uri: photo.uri,
          name: `travel_photo_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        formData.append('photo_timestamp', photo.timestamp);
      }

      // Submit to backend
      const response = await apiFetch('/travel/submit_travel.php', {
        method: 'POST',
        body: formData,
      });

      if (response.success) {
        Alert.alert('Success', 'Travel record submitted successfully!', [
          { text: 'OK', onPress: () => onBack() }
        ]);
      } else {
        throw new Error(response.message || 'Failed to submit travel record');
      }

    } catch (error) {
      console.error('Error submitting travel form:', error);
      Alert.alert('Submission Error', error.message || 'Failed to submit travel record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setStartingKms("");
    setEndingKms("");
    setPhoto(null);
    setLocationPermissionDenied(false);
    getCurrentLocation(); // Refresh location
  };

  return (
    <ScrollView 
      style={styles.page}
      contentContainerStyle={width >= 768 && styles.pageWebContent}
    >
      <View style={[styles.formWrapper, width >= 768 && styles.formWrapperWeb]}>
        <Surface style={styles.formCard} elevation={0}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Travel Record</Text>
            <Text style={styles.subheader}>Record your mileage and travel details</Text>
          </View>

          {/* Current Location Status */}
          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Current Location * (Required)</Text>
            {locationLoading ? (
              <Text style={styles.loadingText}>Loading location...</Text>
            ) : currentLocation ? (
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>Lat: {currentLocation.latitude.toFixed(6)}</Text>
                <Text style={styles.locationText}>Lng: {currentLocation.longitude.toFixed(6)}</Text>
                <Text style={styles.locationText}>Accuracy: ±{currentLocation.accuracy?.toFixed(0) || 'N/A'}m</Text>
                <Text style={styles.locationText}>Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}</Text>
                <Text style={styles.successText}>Location available for submission</Text>
              </View>
            ) : (
              <View style={styles.locationError}>
                {locationPermissionDenied ? (
                  <>
                    <Text style={styles.errorText}>❌ Location permission denied</Text>
                    <Text style={styles.errorText}>Please enable location permissions in your device settings and refresh.</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.errorText}>❌ Location not available</Text>
                    <Text style={styles.errorText}>Unable to get your current location. Please check your GPS settings and try again.</Text>
                  </>
                )}
                <Text style={styles.errorText}>Location is required to submit this travel form.</Text>
              </View>
            )}
            <View style={styles.locationActions}>
              <Button
                mode="outlined"
                onPress={getCurrentLocation}
                loading={locationLoading}
                style={styles.refreshButton}
                contentStyle={styles.refreshButtonContent}
              >
                {locationPermissionDenied ? 'Grant Permission' : 'Refresh Location'}
              </Button>
              {locationPermissionDenied && (
                <Text style={styles.permissionHint}>
                  Tap "Grant Permission" to allow location access
                </Text>
              )}
            </View>
          </Surface>

          {/* Travel Kilometers */}
          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Travel Kilometers *</Text>
            <View style={styles.kmSelectRow}>
              <Text style={styles.kmsSubLabel}>Apply quick select to</Text>
              <Menu
                visible={kmMenuVisible}
                onDismiss={() => setKmMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setKmMenuVisible(true)}
                    style={styles.dropdownButton}
                    contentStyle={styles.dropdownButtonContent}
                    icon="chevron-down"
                  >
                    {selectedKmField === "starting" ? "Starting KM" : "Ending KM"}
                  </Button>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedKmField("starting");
                    setKmMenuVisible(false);
                  }}
                  title="Starting KM"
                />
                <Menu.Item
                  onPress={() => {
                    setSelectedKmField("ending");
                    setKmMenuVisible(false);
                  }}
                  title="Ending KM"
                />
              </Menu>
            </View>

            <View style={styles.kmsSection}>
              <Text style={styles.kmsSubLabel}>
                {selectedKmField === "starting" ? "Starting KM" : "Ending KM"}
              </Text>
              <TextInput
                mode="flat"
                value={selectedKmField === "starting" ? startingKms : endingKms}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  if (selectedKmField === "starting") {
                    setStartingKms(numericText);
                  } else {
                    setEndingKms(numericText);
                  }
                }}
                placeholder="0"
                keyboardType="numeric"
                style={styles.kmsInput}
                underlineColor="#CBD5E1"
                activeUnderlineColor="#2563EB"
                maxLength={6}
              />
            </View>

          </Surface>

          {/* Photo Capture */}
          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Travel Photo *</Text>
            {photo ? (
              <View style={styles.photoContainer}>
                <Card style={styles.photoCard} elevation={0}>
                  <Card.Cover source={{ uri: photo.uri }} style={styles.photo} />
                  <Card.Content style={styles.photoContent}>
                    <Text style={styles.photoText}>Photo captured at {new Date(photo.timestamp).toLocaleTimeString()}</Text>
                    {photo.location && (
                      <Text style={styles.photoText}>Location: {photo.location.latitude.toFixed(4)}, {photo.location.longitude.toFixed(4)}</Text>
                    )}
                  </Card.Content>
                  <Card.Actions style={styles.photoActions}>
                    <Button onPress={openCamera} mode="outlined" style={styles.retakeButton}>Retake Photo</Button>
                  </Card.Actions>
                </Card>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={openCamera}
                icon="camera"
                style={styles.cameraButton}
                contentStyle={styles.cameraButtonContent}
              >
                Open Camera
              </Button>
            )}
          </Surface>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                loading={loading}
                onPress={submitTravelForm}
                disabled={!currentLocation || loading}
                style={[styles.submitButton, (!currentLocation || loading) && styles.disabledButton]}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonLabel}
                icon="check-circle"
              >
                {currentLocation ? 'Submit' : 'Location Required'}
              </Button>

              <Button
                mode="outlined"
                onPress={clearForm}
                style={styles.clearButton}
                contentStyle={styles.clearButtonContent}
                labelStyle={styles.clearButtonLabel}
                icon="restart"
              >
                Clear
              </Button>
            </View>

            <Button 
              mode="text" 
              onPress={onBack}
              style={styles.backButton}
              icon="arrow-left"
            >
              Back
            </Button>
          </View>
        </Surface>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  pageWebContent: {
    paddingHorizontal: 40,
    paddingVertical: 36,
    alignItems: "center",
  },
  formWrapper: {
    width: "100%",
  },
  formWrapperWeb: {
    width: 420,
  },
  formCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 26,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 1,
  },
  headerContainer: {
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    alignItems: "center",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  subheader: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  fieldCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "transparent",
    fontSize: 15,
    paddingVertical: 4,
  },
  locationInfo: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
  },
  locationError: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    marginBottom: 4,
  },
  locationActions: {
    gap: 8,
  },
  permissionHint: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
  },
  kmsSection: {
    marginBottom: 16,
  },
  kmsInputGroup: {
    marginBottom: 12,
  },
  kmsSubLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kmsInput: {
    backgroundColor: "transparent",
    fontSize: 16,
    paddingVertical: 4,
    textAlign: "center",
    fontWeight: "600",
  },

  selectedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    textAlign: "center",
  },
  photoContainer: {
    width: "100%",
  },
  photoCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  photo: {
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  photoContent: {
    padding: 12,
  },
  photoText: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 4,
  },
  photoActions: {
    padding: 8,
    justifyContent: "center",
  },
  retakeButton: {
    borderRadius: 6,
  },
  cameraButton: {
    borderRadius: 8,
    borderColor: "#2563EB",
  },
  cameraButtonContent: {
    paddingVertical: 12,
  },
  summaryContainer: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryText: {
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 4,
  },
  kmSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dropdownButton: {
    borderRadius: 8,
  },
  dropdownButtonContent: {
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  submitButton: {
    borderRadius: 4,
    elevation: 0,
    backgroundColor: "#2563EB",
    height: 24,
    maxHeight: 24,
    maxWidth: 140,
    paddingHorizontal: 8,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonContent: {
    paddingVertical: 0,
    height: 24,
  },
  submitButtonLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearButton: {
    borderRadius: 4,
    borderColor: "#2563EB",
    height: 24,
    maxHeight: 24,
    maxWidth: 80,
    paddingHorizontal: 8,
  },
  clearButtonContent: {
    paddingVertical: 0,
    height: 24,
  },
  clearButtonLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#2563EB",
  },
  backButton: {
    marginTop: 4,
  },
});
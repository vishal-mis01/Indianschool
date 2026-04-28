import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Button, TextInput, Surface } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import apiFetch from "./apiFetch";

export default function UserFormFill({ formId, onBack }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  /* LOAD FORM FIELDS */
  useEffect(() => {
    if (!formId) return;

    apiFetch(`/forms/list_form_fields.php?form_id=${formId}`)
      .then((res) => {
        setFields(Array.isArray(res) ? res : []);
        setValues({});
      })
      .catch((err) => {
        console.error("Failed to load form fields:", err);
        setFields([]);
        // Show user-friendly error message
        if (err.message && err.message.includes("CORS")) {
          alert("Connection Error: Unable to load form. Please check your network connection or contact support.");
        }
      });
  }, [formId]);

  /* PICK FILE */
  const pickFile = async (fieldId) => {
    const res = await DocumentPicker.getDocumentAsync({});
    if (res.canceled) return;

    setValues((prev) => ({
      ...prev,
      [fieldId]: res.assets[0],
    }));
  };

  /* CAPTURE PHOTO WITH LOCATION AND TIMESTAMP */
  const capturePhoto = async (fieldId) => {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        alert('Camera permission is required to take photos');
        return;
      }

      // Request location permissions
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        alert('Location permission is required to capture photo location');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Capture photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const photo = result.assets[0];
        const timestamp = new Date().toISOString();

        // Create enhanced photo object with metadata
        const photoWithMetadata = {
          ...photo,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          },
          timestamp: timestamp,
          capturedAt: timestamp,
        };

        setValues((prev) => ({
          ...prev,
          [fieldId]: photoWithMetadata,
        }));
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Failed to capture photo. Please try again.');
    }
  };

  /* CLEAR FORM */
  const clearForm = () => {
    setValues({});
  };

  /* SUBMIT FORM + CREATE FMS INSTANCE */
  const submitForm = async () => {
    try {
      setLoading(true);

      // Validate that all fields are filled
      if (fields.length === 0) {
        alert("No fields to submit");
        setLoading(false);
        return;
      }

      const emptyFields = fields.filter(f => {
        const value = values[f.id];
        return !value || (typeof value === 'string' && value.trim() === '');
      });

      if (emptyFields.length > 0) {
        alert(`Please fill in all required fields: ${emptyFields.map(f => f.label).join(', ')}`);
        setLoading(false);
        return;
      }

      // 1️⃣ build formdata
      const fd = new FormData();
      fd.append("form_id", formId);

      Object.entries(values).forEach(([fieldId, value]) => {
        if (value?.uri) {
          // Handle file/camera uploads
          fd.append(`files[${fieldId}]`, {
            uri: value.uri,
            name: value.name || `photo_${Date.now()}.jpg`,
            type: value.mimeType || "image/jpeg",
          });
          
          // Add metadata for camera photos
          if (value.location) {
            fd.append(`metadata[${fieldId}][latitude]`, value.location.latitude.toString());
            fd.append(`metadata[${fieldId}][longitude]`, value.location.longitude.toString());
            fd.append(`metadata[${fieldId}][accuracy]`, value.location.accuracy?.toString() || '0');
            fd.append(`metadata[${fieldId}][timestamp]`, value.timestamp);
          }
        } else {
          fd.append(`values[${fieldId}]`, value);
        }
      });

      // 2️⃣ submit form using apiFetch
      const data = await apiFetch("/forms/submit_form.php", {
        method: "POST",
        body: fd,
      });

      if (!data.submission_id) {
        throw new Error("Submission failed");
      }

      // Show success message with FMS status
      const message = data.fms_status 
        ? `Form submitted! ${data.fms_status}`
        : "Form submitted successfully";
      
      alert(message);
      onBack();

    } catch (e) {
      console.error("Form submission error:", e);
      let errorMessage = "Form submission failed";
      
      if (e.message) {
        if (e.message.includes("CORS") || e.message.includes("Network")) {
          errorMessage = "Network Error: Unable to submit form. Please check your connection and try again.";
        } else {
          errorMessage = e.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.page}
      contentContainerStyle={width >= 768 && styles.pageWebContent}
    >
      <View style={[styles.formWrapper, width >= 768 && styles.formWrapperWeb]}>
        <Surface style={styles.formCard} elevation={0}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Fill Form</Text>
            <Text style={styles.subheader}>Complete all required fields</Text>
          </View>

          {fields.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No fields found.</Text>
            </View>
          )}

          {fields.map((f) => (
            <Surface key={f.id} style={styles.fieldCard}>
              <Text style={styles.label}>{f.label}</Text>

              {f.field_type === "file" ? (
                <Button 
                  mode="outlined" 
                  onPress={() => pickFile(f.id)}
                  icon="upload"
                  style={styles.uploadButton}
                  contentStyle={styles.uploadButtonContent}
                >
                  {values[f.id]?.name || "Upload File"}
                </Button>
              ) : f.field_type === "camera" ? (
                <View style={styles.cameraContainer}>
                  <Button 
                    mode="outlined" 
                    onPress={() => capturePhoto(f.id)}
                    icon="camera"
                    style={styles.uploadButton}
                    contentStyle={styles.uploadButtonContent}
                  >
                    {values[f.id] ? "Photo Captured" : "Take Photo"}
                  </Button>
                  {values[f.id] && values[f.id].location && (
                    <View style={styles.metadataContainer}>
                      <Text style={styles.metadataText}>
                        📍 Location: {values[f.id].location.latitude.toFixed(6)}, {values[f.id].location.longitude.toFixed(6)}
                      </Text>
                      <Text style={styles.metadataText}>
                        🕒 Captured: {new Date(values[f.id].timestamp).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <TextInput
                  mode="flat"
                  value={values[f.id] || ""}
                  onChangeText={(t) =>
                    setValues((prev) => ({ ...prev, [f.id]: t }))
                  }
                  style={styles.input}
                  underlineColor="#0EA5E9"
                  placeholderTextColor="#000000"
                />
              )}
            </Surface>
          ))}

          <View style={styles.buttonContainer}>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                loading={loading}
                onPress={submitForm}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonLabel}
                icon="check-circle"
              >
                Submit
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
    padding: 16,
    // backgroundColor removed to allow gradient
    width: '100%',
    paddingBottom: 120,
  },
  pageWebContent: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formWrapper: {
    width: '100%',
  },
  formWrapperWeb: {
    width: '33.33%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  formCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 0,
  },
  headerContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
    color: "#0F172A",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subheader: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  fieldCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    color: "#0F172A",
  },
  input: {
    backgroundColor: "transparent",
    fontSize: 14,
    height: 40,
    width: '50%',
    color: "#000000",
  },
  uploadButton: {
    borderRadius: 8,
    borderColor: "#2563EB",
  },
  uploadButtonContent: {
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
    maxWidth: 60,
    paddingHorizontal: 8,
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
    maxWidth: 60,
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
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 15,
    fontStyle: "italic",
  },
  cameraContainer: {
    width: '100%',
  },
  metadataContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metadataText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 2,
  },
});

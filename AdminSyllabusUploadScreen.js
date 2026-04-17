import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Surface, Button, TextInput, ActivityIndicator, Chip } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import apiFetch from "./apiFetch";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";

export default function AdminSyllabusUploadScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [classSubjectId, setClassSubjectId] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    loadClassSubjects();
  }, []);

  const loadClassSubjects = async () => {
    try {
      const data = await apiFetch("/curriculum/get_all_class_subjects.php", {
        method: "GET",
      });
      if (Array.isArray(data)) {
        setClassSubjects(data);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load classes: " + err.message);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
          "text/csv",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile(file);
        // Preview will be loaded after upload
        Alert.alert(
          "File Selected",
          `${file.name} selected. Click "Preview & Upload" to proceed.`
        );
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick file: " + err.message);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert("Error", "Please select a file first");
      return;
    }

    if (!selectedClass) {
      Alert.alert("Error", "Please select a class/subject");
      return;
    }

    setLoading(true);
    try {
      // For web, fetch the file as blob first
      let fileBlob;
      if (selectedFile.uri.startsWith('file://')) {
        // File URI from DocumentPicker
        const response = await fetch(selectedFile.uri);
        fileBlob = await response.blob();
      } else {
        // Already a blob or data URI
        const response = await fetch(selectedFile.uri);
        fileBlob = await response.blob();
      }

      const formData = new FormData();
      formData.append("file", fileBlob, selectedFile.name);
      formData.append("class_subject_id", selectedClass.class_subject_id);

      const response = await apiFetch("/curriculum/upload_syllabus.php", {
        method: "POST",
        body: formData,
      });

      if (response.success) {
        setUploadResult(response);
        setPreview(response.preview || []);
        Alert.alert(
          "Success",
          `${response.inserted_rows} rows inserted, ${response.updated_rows} rows updated`
        );
        setSelectedFile(null);
        setSelectedClass(null);
      } else {
        Alert.alert("Error", response.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Error", err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSyllabus = async () => {
    if (!selectedClass) {
      Alert.alert("Error", "Please select a class/subject before deleting");
      return;
    }

    Alert.alert(
      "Confirm delete",
      `Delete the entire syllabus for ${selectedClass.class_name} - ${selectedClass.subject_name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              const classSubjectId = selectedClass?.class_subject_id || selectedClass?.id;
              console.log("Deleting syllabus for class_subject_id", classSubjectId);

              const response = await apiFetch("/curriculum/delete_syllabus.php", {
                method: "POST",
                body: JSON.stringify({ class_subject_id: classSubjectId }),
              });

              if (response.success) {
                Alert.alert(
                  "Deleted",
                  `${response.deleted_syllabus_rows} syllabus rows removed, ${response.deleted_progress_rows} progress rows removed.`
                );
                setUploadResult(null);
                setPreview([]);
                setSelectedClass(null);
              } else {
                console.error("Delete syllabus endpoint responded with error:", response);
                Alert.alert("Error", response.error || "Delete failed");
              }
            } catch (err) {
              console.error("Delete error:", err);
              Alert.alert("Error", err.message || "Delete failed");
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.card}>
        <Text style={styles.title}>📚 Upload Syllabus</Text>
        <Text style={styles.subtitle}>
          Upload Excel/CSV file with curriculum data
        </Text>

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionTitle}>📋 Supported Formats:</Text>
          <Text style={styles.instruction}>✅ Excel files (.xlsx or .xls)</Text>
          <Text style={styles.instruction}>✅ CSV files (.csv)</Text>
          
          <Text style={[styles.instructionTitle, { marginTop: 12 }]}>📊 Excel Column Order (Week-Wise):</Text>
          <Text style={styles.instruction}>
            • Column A: week_no (e.g., 1, 2, 3, 4...)
          </Text>
          <Text style={styles.instruction}>
            • Column B: chapter_no (e.g., 1, 2, 5)
          </Text>
          <Text style={styles.instruction}>
            • Column C: chapter_name (e.g., "Coordination Compounds")
          </Text>
          <Text style={styles.instruction}>
            • Column D: topic (e.g., "INTRODUCTION")
          </Text>
          <Text style={styles.instruction}>
            • Column E: sub_topic (e.g., "DEFINATION, LIGANDS")
          </Text>
          <Text style={styles.instruction}>
            • Column F: activity (e.g., "WORKSHEET PRACTICE")
          </Text>
          <Text style={styles.instruction}>
            • Column G: lec_required (e.g., 0.5, 1, 2)
          </Text>
          <Text style={styles.instruction}>
            • Column H: sequence_order (e.g., 1, 2, 3...)
          </Text>
          <Text style={styles.instruction}>
            • Column I: section_type (e.g., "theory", "practical", "activity")
          </Text>
          <Text style={styles.instruction}>
            Note: At least 5 columns required (A-E: week_no, chapter_no, chapter_name, topic, sub_topic). Up to 9 columns supported (A-I).
          </Text>
        </View>

        {/* File Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Select File</Text>
          <Button
            icon="file-upload"
            mode="contained"
            onPress={pickDocument}
            style={styles.button}
          >
            Choose Excel/CSV File
          </Button>

          {selectedFile && (
            <Chip
              icon="file-outline"
              onClose={() => setSelectedFile(null)}
              style={styles.fileChip}
            >
              {selectedFile.name}
            </Chip>
          )}
        </View>

        {/* Class Subject Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 2: Select Class & Subject</Text>
          <Button
            icon="view-list"
            mode={selectedClass ? "contained" : "outlined"}
            onPress={() => setShowClassPicker(true)}
            style={styles.button}
          >
            {selectedClass ? `${selectedClass.class_name} - ${selectedClass.subject_name}` : "Choose Class"}
          </Button>
          {selectedClass && (
            <Chip
              icon="check-circle"
              onClose={() => setSelectedClass(null)}
              style={styles.selectedChip}
            >
              ID: {selectedClass.class_subject_id}
            </Chip>
          )}

          {selectedClass && (
            <Button
              mode="outlined"
              icon="delete"
              onPress={handleDeleteSyllabus}
              loading={deleteLoading}
              disabled={deleteLoading}
              style={[styles.button, { marginTop: 12, borderColor: "#f44336" }]}
              labelStyle={{ color: "#f44336" }}
            >
              Delete entire syllabus for selected class
            </Button>
          )}
        </View>

        {/* Class Picker Modal */}
        <Modal
          visible={showClassPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowClassPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <Surface style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Class & Subject</Text>
                <Button icon="close" onPress={() => setShowClassPicker(false)} />
              </View>
              <ScrollView style={{ maxHeight: "calc(70vh - 60px)" }}>
                {classSubjects.map((item) => (
                  <TouchableOpacity
                    key={item.class_subject_id}
                    onPress={() => {
                      setSelectedClass(item);
                      setShowClassPicker(false);
                    }}
                    style={[
                      styles.classItem,
                      selectedClass?.class_subject_id === item.class_subject_id && styles.classItemSelected
                    ]}
                  >
                    <Text style={styles.classItemText}>
                      {item.class_name} - {item.subject_name}
                    </Text>
                    <Text style={styles.classItemId}>ID: {item.class_subject_id}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Surface>
          </View>
        </Modal>

        {/* Upload Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 3: Upload</Text>
          <Button
            icon="cloud-upload"
            mode="contained"
            onPress={handleUpload}
            loading={loading}
            disabled={!selectedFile || !selectedClass || loading}
            style={styles.button}
          >
            Preview & Upload
          </Button>
        </View>

        {/* Results */}
        {uploadResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>✅ Upload Results</Text>
            <Text style={styles.resultText}>
              Inserted: {uploadResult.inserted_rows} rows
            </Text>
            <Text style={styles.resultText}>
              Updated: {uploadResult.updated_rows} rows
            </Text>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <View style={styles.errorSection}>
                <Text style={styles.errorTitle}>Errors:</Text>
                {uploadResult.errors.slice(0, 5).map((error, idx) => (
                  <Text key={idx} style={styles.errorText}>
                    • Row {error.row}: {error.message}
                  </Text>
                ))}
                {uploadResult.errors.length > 5 && (
                  <Text style={styles.errorText}>
                    ... and {uploadResult.errors.length - 5} more errors
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>📋 Preview (First 5 rows)</Text>
            <FlatList
              data={preview.slice(0, 5)}
              renderItem={({ item }) => (
                <View style={styles.previewRow}>
                  <Text style={styles.previewCell}>
                    Ch {item.chapter_no} ({item.class_subject_id}): {item.chapter_name}
                  </Text>
                  <Text style={styles.previewCell}>{item.topic}</Text>
                  <Text style={styles.previewCell}>{item.sub_topic}</Text>
                </View>
              )}
              keyExtractor={(item, idx) => `${item.class_subject_id || ''}_${item.chapter_no}_${idx}`}
              scrollEnabled={false}
            />
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  instructionsBox: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionTitle: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  instruction: {
    fontSize: 12,
    color: "#333",
    marginBottom: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  button: {
    marginVertical: 8,
  },
  fileChip: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  selectedChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#c8e6c9",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  resultBox: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  resultTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 13,
    color: "#333",
    marginBottom: 4,
  },
  errorSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 12,
  },
  errorTitle: {
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#d32f2f",
    marginBottom: 4,
  },
  previewBox: {
    backgroundColor: "#fff3e0",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  previewTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 12,
  },
  previewRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  previewCell: {
    fontSize: 12,
    color: "#333",
    marginBottom: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    borderRadius: 12,
    padding: 0,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f5f5f5",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  classItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  classItemSelected: {
    backgroundColor: "#e3f2fd",
  },
  classItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  classItemId: {
    fontSize: 12,
    color: "#c4c0c0",
    marginTop: 4,
  },
});

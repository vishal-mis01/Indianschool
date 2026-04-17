import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import apiFetch from "./apiFetch";

export default function UserTasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({});
  const [remarks, setRemarks] = useState({});
  const [showRemarksInput, setShowRemarksInput] = useState({});
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await apiFetch("/get_user_checklist.php?user_id=" + user.user_id);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function pickPhoto(assignmentId) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos((prev) => ({
        ...prev,
        [assignmentId]: result.assets[0],
      }));
    }
  }

  async function markComplete(task, status = "done") {
    const taskRemarks = remarks[task.assignment_id] || "";

    // Remarks are optional for NA tasks
    // if (status === "na" && !taskRemarks.trim()) {
    //   Alert.alert("Remarks Required", "Please provide remarks explaining why this task is not applicable to you.");
    //   return;
    // }

    // Tasks requiring photos must have photo attached (only for 'done' status)
    if (status === "done" && task.requires_photo === 1 && !photos[task.assignment_id]) {
      Alert.alert("Photo Required", "Please attach a photo to complete this task");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [task.assignment_id]: true }));

    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("task_template_id", task.task_id);
    formData.append("assignment_id", task.assignment_id);
    formData.append("task_date", new Date().toISOString().split("T")[0]);
    formData.append("status", status);

    if (taskRemarks.trim()) {
      formData.append("remarks", taskRemarks.trim());
    }

    // Add photo if attached and status is 'done'
    if (status === "done" && photos[task.assignment_id]) {
      const photo = photos[task.assignment_id];
      formData.append("photo", {
        uri: photo.uri,
        name: photo.filename || `photo_${task.assignment_id}.jpg`,
        type: photo.type || "image/jpeg",
      });
    }

    const response = await apiFetch("/submit_task.php", {
      method: "POST",
      body: formData,
    });

    if (!response.success) {
      throw new Error(response.error || "Submission failed");
    }

    // Remove task from list (by assignment)
    setTasks((prev) => prev.filter((t) => t.assignment_id !== task.assignment_id));
    setPhotos((prev) => {
      const updated = { ...prev };
      delete updated[task.assignment_id];
      return updated;
    });
    setRemarks((prev) => {
      const updated = { ...prev };
      delete updated[task.assignment_id];
      return updated;
    });
    setShowRemarksInput((prev) => {
      const updated = { ...prev };
      delete updated[task.assignment_id];
      return updated;
    });

    Alert.alert("Success", status === "na" ? "Task marked as Not Applicable!" : "Task marked as complete!");
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} horizontal={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Checklist</Text>
        <Text style={styles.count}>{tasks.length} pending tasks</Text>
      </View>

      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-circle" size={64} color="#94A3B8" />
          <Text style={styles.emptyText}>All tasks completed!</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {/* TABLE HEADER */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.taskCol]}>Task</Text>
            <Text style={[styles.tableCell, styles.typeCol]}>Type</Text>
            <Text style={[styles.tableCell, styles.actionCol]}>Action</Text>
          </View>

          {/* TABLE ROWS */}
          {tasks.map((task) => (
            <Surface key={task.assignment_id || task.task_id} style={styles.tableRow}>
              <View style={styles.taskColContent}>
                <View style={styles.taskNameSection}>
                  <Text style={styles.taskName}>{task.title}</Text>
                  {task.requires_photo === 1 && (
                    <View style={styles.photoTag}>
                      <Ionicons name="camera" size={12} color="#DC2626" />
                      <Text style={styles.photoTagText}>Photo required</Text>
                    </View>
                  )}
                </View>

                {photos[task.assignment_id] && (
                  <View style={styles.photoPreview}>
                    <Image
                      source={{ uri: photos[task.assignment_id].uri }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setPhotos((prev) => {
                          const updated = { ...prev };
                          delete updated[task.assignmentgnment_id];
                          return updated;
                        })
                      }
                      style={styles.removePhotoBtn}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.typeColContent}>
                <Text style={styles.frequency}>
                  {task.frequency === "D"
                    ? "Daily"
                    : task.frequency === "W"
                    ? "Weekly"
                    : task.frequency === "M"
                    ? "Monthly"
                    : "Yearly"}
                </Text>
              </View>

              <View style={styles.actionColContent}>
                {/* Remarks Input - shown when NA is selected */}
                {showRemarksInput[task.assignment_id] && (
                  <View style={styles.remarksContainer}>
                    <TextInput
                      style={styles.remarksInput}
                      placeholder="Optional: Why is this task not applicable?"
                      value={remarks[task.assignment_id] || ""}
                      onChangeText={(text) =>
                        setRemarks((prev) => ({ ...prev, [task.assignment_id]: text }))
                      }
                      multiline
                      numberOfLines={2}
                      maxLength={500}
                    />
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  {/* Photo Button (only for tasks requiring photos) */}
                  {task.requires_photo === 1 && (
                    <TouchableOpacity
                      style={[
                        styles.photoBtn,
                        photos[task.assignment_id] && styles.photoBtnActive,
                      ]}
                      onPress={() => pickPhoto(task.assignment_id)}
                    >
                      <Ionicons
                        name={photos[task.assignment_id] ? "checkmark-circle" : "camera"}
                        size={18}
                        color={photos[task.assignment_id] ? "#10B981" : "#64748B"}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Complete Button */}
                  <TouchableOpacity
                    style={[
                      styles.completeBtn,
                      task.requires_photo === 1 && !photos[task.assignment_id] && styles.completeBtnDisabled,
                    ]}
                    onPress={() => markComplete(task, "done")}
                    disabled={
                      (task.requires_photo === 1 && !photos[task.assignment_id]) ||
                      submitting[task.assignment_id]
                    }
                  >
                    {submitting[task.assignment_id] ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>✓</Text>
                    )}
                  </TouchableOpacity>

                  {/* NA Button */}
                  <TouchableOpacity
                    style={styles.naBtn}
                    onPress={() => {
                      setShowRemarksInput((prev) => ({
                        ...prev,
                        [task.assignment_id]: !prev[task.assignment_id],
                      }));
                      if (!showRemarksInput[task.assignment_id]) {
                        // Clear any existing remarks when opening
                        setRemarks((prev) => ({ ...prev, [task.assignment_id]: "" }));
                      }
                    }}
                    disabled={submitting[task.assignment_id]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.naButtonText}>NA</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Submit NA Button (shown when remarks input is visible) */}
                {showRemarksInput[task.assignment_id] && (
                  <TouchableOpacity
                    style={styles.submitNaBtn}
                    onPress={() => markComplete(task, "na")}
                    disabled={submitting[task.assignment_id]}
                  >
                    {submitting[task.assignment_id] ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitNaBtnText}>Submit NA</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </Surface>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed to allow gradient
    padding: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
    textAlign: "center",
  },
  count: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#94A3B8",
    marginTop: 12,
    fontWeight: "600",
  },
  tableContainer: {
    borderRadius: 8,
    overflow: "hidden",
    // backgroundColor removed to allow gradient
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  tableCell: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  taskCol: {
    flex: 1.5,
  },
  typeCol: {
    flex: 0.6,
  },
  actionCol: {
    flex: 0.7,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
    elevation: 0,
    // backgroundColor removed to allow gradient
  },
  taskColContent: {
    flex: 1.5,
    marginRight: 8,
  },
  taskNameSection: {
    marginBottom: 5,
  },
  taskName: {
    fontSize: 30,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  photoTagText: {
    fontSize: 9,
    color: "#DC2626",
    fontWeight: "600",
  },
  photoPreview: {
    position: "relative",
    marginTop: 5,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: 'transparent',
  },
  previewImage: {
    width: "100%",
    height: 50,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 3,
    right: 3,
    backgroundColor: "#DC2626",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  typeColContent: {
    flex: 0.6,
    alignItems: "center",
  },
  frequency: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  actionColContent: {
    flex: 0.7,
    flexDirection: "row",
    gap: 5,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  photoBtn: {
    backgroundColor: "#F1F5F9",
    padding: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  photoBtnActive: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  completeBtn: {
    backgroundColor: "#2563EB",
    padding: 6,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 36,
    minHeight: 36,
  },
  completeBtnDisabled: {
    backgroundColor: "#CBD5E1",
    opacity: 0.5,
  },
  remarksContainer: {
    marginBottom: 8,
    width: "100%",
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 5,
    padding: 8,
    fontSize: 12,
    backgroundColor: "#FFFFFF",
    minHeight: 50,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  naBtn: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 36,
    minHeight: 36,
  },
  naButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  submitNaBtn: {
    backgroundColor: "#DC2626",
    padding: 6,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
    minWidth: 80,
  },
  submitNaBtnDisabled: {
    backgroundColor: "#FCA5A5",
    opacity: 0.5,
  },
  submitNaBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

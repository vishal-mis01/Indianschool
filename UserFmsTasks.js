import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Text, Button, Surface, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

import apiFetch from "./apiFetch";

export default function UserFmsTasks() {
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  /* LOAD TASKS */
  const loadTasks = async () => {
    try {
      const data = await apiFetch("/fms/user_tasks.php");
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD TASK ERROR:", err);
      setTasks([]);
    }
  };

  /* AUTO REFRESH */
  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  /* COMPLETE STEP */
  const completeStep = async (stepId) => {
    try {
      const res = await apiFetch("/fms/complete_step.php", {
        method: "POST",
        body: { step_id: stepId },
      });
      
      if (res.success) {
        alert("Step completed!");
        loadTasks();
      } else {
        alert("Failed to complete step: " + (res.message || "Unknown error"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  /* UPLOAD + COMPLETE */
  const uploadAndComplete = async (stepId) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.canceled) return;

      const file = result.assets[0];

      // Read file as base64
      alert("Reading file...");
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1]; // Remove "data:...;base64," prefix

          console.log("🔵 Uploading file for step:", stepId);
          console.log("📁 File:", file.name, "Size:", blob.size);

          const res = await apiFetch("/fms/upload_step_file.php", {
            method: "POST",
            body: {
              step_id: stepId,
              file_name: file.name,
              file_data: base64,
              file_type: file.mimeType || "application/octet-stream",
            },
          });

          if (res.success) {
            alert("File uploaded and step completed!");
            loadTasks();
          } else {
            alert("Failed to upload: " + (res.message || "Unknown error"));
          }
        } catch (err) {
          alert("Error: " + err.message);
        }
      };

      reader.readAsDataURL(blob);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Helper function to format field names
  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FMS Tasks</Text>
        <Text style={styles.subtitle}>Complete your workflow tasks</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.emptyText}>No pending tasks</Text>
            <Text style={styles.emptySubtext}>Great job! All caught up</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Surface style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="flash" size={24} color="#2563EB" />
                <Text style={styles.cardTitle}>Workflow Tasks</Text>
              </View>
              <Divider style={styles.divider} />

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* GET ALL UNIQUE FORM FIELD NAMES */}
                  {(() => {
                    const allFieldNames = new Set();
                    tasks.forEach(t => {
                      const formData = t.form_data ? JSON.parse(t.form_data) : null;
                      if (formData) {
                        Object.keys(formData)
                          .filter(name => name.toLowerCase() !== 'process') // Exclude 'process' field
                          .forEach(name => allFieldNames.add(name));
                      }
                    });
                    const fieldNames = Array.from(allFieldNames);

                    return (
                      <>
                        {/* TABLE HEADER */}
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderCell, styles.processCol]}>Process</Text>
                          <Text style={[styles.tableHeaderCell, styles.stepCol]}>Step Name</Text>
                          {fieldNames.map(fname => (
                            <Text key={fname} style={[styles.tableHeaderCell, styles.formFieldCol]}>
                              {formatFieldName(fname)}
                            </Text>
                          ))}
                          <Text style={[styles.tableHeaderCell, styles.dateCol]}>Due Date</Text>
                          <Text style={[styles.tableHeaderCell, styles.actionCol]}>Action</Text>
                        </View>

                        {/* TABLE ROWS */}
                        {tasks.map((t, idx) => {
                          const isLate =
                            t.planned_at &&
                            !t.actual_at &&
                            new Date(t.planned_at) < new Date();
                          const formData = t.form_data ? JSON.parse(t.form_data) : null;

                          return (
                            <View key={t.step_id} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                              <Text style={[styles.tableCell, styles.processCol, styles.processCellText]}>
                                {t.step_name || "Other"}
                              </Text>
                              <Text style={[styles.tableCell, styles.stepCol]}>
                                {t.reference_title} {isLate && "⚠️"}
                              </Text>
                              {fieldNames.map(fname => (
                                <Text key={fname} style={[styles.tableCell, styles.formFieldCol, styles.formFieldValue]} numberOfLines={2}>
                                  {formData && formData[fname] ? String(formData[fname]) : "—"}
                                </Text>
                              ))}
                              <Text style={[styles.tableCell, styles.dateCol, styles.centerText]}>
                                {t.planned_at ? new Date(t.planned_at).toLocaleString() : "N/A"}
                              </Text>
                              <View style={[styles.tableCell, styles.actionCol, styles.actionCell]}>
                                <Button
                                  mode="contained"
                                  onPress={() => {
                                    if (t.requires_upload) {
                                      uploadAndComplete(t.step_id);
                                    } else {
                                      completeStep(t.step_id);
                                    }
                                  }}
                                  size="small"
                                  style={styles.actionBtn}
                                  labelStyle={styles.actionBtnLabel}
                                  icon={t.requires_upload ? "upload" : "check"}
                                >
                                  {t.requires_upload ? "Upload" : "Done"}
                                </Button>
                              </View>
                            </View>
                          );
                        })}
                      </>
                    );
                  })()}
                </View>
              </ScrollView>
            </Surface>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed to allow gradient
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    // backgroundColor removed to allow gradient
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  divider: {
    marginVertical: 0,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#1E293B",
    borderBottomWidth: 2,
    borderBottomColor: "#CBD5E1",
  },
  tableHeaderCell: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: 'transparent',
  },
  tableCell: {
    fontSize: 12,
    color: "#1E293B",
  },
  centerText: {
    textAlign: "center",
  },
  processCol: {
    flex: 1.2,
  },
  processCellText: {
    fontWeight: "600",
  },
  stepCol: {
    flex: 1.5,
  },
  dateCol: {
    flex: 1,
  },
  actionCol: {
    flex: 1,
  },
  formFieldCol: {
    flex: 0.8,
    minWidth: 100,
  },
  actionCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  actionBtn: {
    paddingHorizontal: 10,
  },
  actionBtnLabel: {
    fontSize: 11,
  },
  formFieldValue: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "400",
  },
});

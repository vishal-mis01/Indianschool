import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { Surface } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";

export default function UserAllTasks({ user }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [checklistTasks, setChecklistTasks] = useState([]);
  const [fmsTasks, setFmsTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [photos, setPhotos] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [error, setError] = useState("");

  // Debug logs
  useEffect(() => {
    console.log('[UserAllTasks] checklistTasks:', checklistTasks);
    console.log('[UserAllTasks] fmsTasks:', fmsTasks);
  }, [checklistTasks, fmsTasks]);
  useEffect(() => {
    console.log('[UserAllTasks] useEffect user:', user);
    fetchTasks();
    // eslint-disable-next-line
  }, [user?.user_id]);

  // Minus summary calculation (UserReports.js logic)
  const checklistPlanned = checklistTasks.length;
  const checklistActual = checklistTasks.filter(t => t.completed === 1).length;
  const checklistOnTime = checklistTasks.filter(t => t.completed === 1 && t.on_time === 1).length;
  const checklistMinusCompletion = checklistPlanned > 0 ? Math.round(100 - (checklistActual / checklistPlanned) * 100) : 0;
  const checklistMinusOnTime = checklistActual > 0 ? Math.round(100 - (checklistOnTime / checklistActual) * 100) : 0;

  const fmsPlanned = fmsTasks.length;
  const fmsActual = fmsTasks.filter(t => t.completed === 1).length;
  const fmsOnTime = fmsTasks.filter(t => t.completed === 1 && t.on_time === 1).length;
  const fmsMinusCompletion = fmsPlanned > 0 ? Math.round(100 - (fmsActual / fmsPlanned) * 100) : 0;
  const fmsMinusOnTime = fmsActual > 0 ? Math.round(100 - (fmsOnTime / fmsActual) * 100) : 0;

  const fetchTasks = async () => {
    if (!user?.user_id) {
      console.warn('[UserAllTasks] fetchTasks: Missing user_id', user);
      setError("Missing user_id. Please log in again.");
      setChecklistTasks([]);
      setFmsTasks([]);
      return;
    }
    try {
      console.log('[UserAllTasks] fetchTasks: Calling API with user_id:', user.user_id);
      const [checklist, fms] = await Promise.all([
        apiFetch(`/get_user_checklist.php?user_id=${user.user_id}`),
        apiFetch(`/fms/user_tasks.php`),
      ]);
      setChecklistTasks(Array.isArray(checklist?.tasks) ? checklist.tasks : []);
      setFmsTasks(Array.isArray(fms) ? fms : []);
      setError("");
    } catch (err) {
      console.error('[UserAllTasks] fetchTasks: Failed to load tasks', err);
      setChecklistTasks([]);
      setFmsTasks([]);
      setError("Failed to load tasks.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  // Unified task list logic: combine checklist and FMS tasks into one list, sorted by date
  const allTasks = [
    ...checklistTasks.map(task => ({
      ...task,
      _type: 'checklist',
      _date: task.scheduled_date ? new Date(task.scheduled_date).getTime() : 0,
    })),
    ...fmsTasks.map(task => ({
      ...task,
      _type: 'fms',
      _date: task.planned_at ? new Date(task.planned_at).getTime() : 0,
    })),
  ].sort((a, b) => b._date - a._date);

  // Debug log for unified task list
  useEffect(() => {
    console.log('[UserAllTasks] allTasks:', allTasks);
  }, [allTasks]);

  function formatFieldName(fieldName) {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function renderFmsSentence(task, parsed) {
    // Only return formatted fields for FMS formFieldCol
    const fieldParts = Object.entries(parsed || {})
      .map(([k, v]) => `${formatFieldName(k)}: ${v}`)
      .join(', ');
    return fieldParts || '-';
  }

  // Photo picker for checklist tasks
  const pickPhoto = async (assignmentId) => {
    const result = await window.ImagePicker
      ? await window.ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'Images',
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        })
      : await import('expo-image-picker').then(ImagePicker =>
          ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
          })
        );
    if (!result.canceled) {
      const asset = result.assets ? result.assets[0] : result;
      setPhotos((prev) => ({ ...prev, [assignmentId]: asset.uri || asset.uri }));
    }
  };

  // Submit checklist task (real API)
  const submitChecklistTask = async (task, status = 'done') => {
    setSubmitting((prev) => ({ ...prev, [task.assignment_id]: true }));
    try {
      const formData = new FormData();
      formData.append('assignment_id', task.assignment_id);
      formData.append('user_id', user?.user_id);
      formData.append('task_date', task.scheduled_date); // Required by backend
      formData.append('status', status);
      if (task.task_id) {
        formData.append('task_template_id', task.task_id); // Some backend logic may require this
      }
      if (photos[task.assignment_id]) {
        formData.append('photo', {
          uri: photos[task.assignment_id],
          type: 'image/jpeg',
          name: `task_${task.assignment_id}.jpg`,
        });
      }
      const res = await apiFetch('/submit_task.php', {
        method: 'POST',
        body: formData,
      });
      if (res.success) {
        setPhotos((prev) => ({ ...prev, [task.assignment_id]: null }));
        await fetchTasks();
      } else {
        alert('Failed to submit: ' + (res.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting((prev) => ({ ...prev, [task.assignment_id]: false }));
    }
  };

  // Submit FMS task (real API)
  const submitFmsTask = async (task) => {
    setSubmitting((prev) => ({ ...prev, [task.step_id]: true }));
    try {
      const res = await apiFetch('/fms/complete_step.php', {
        method: 'POST',
        body: { step_id: task.step_id },
      });
      if (res.success) {
        await fetchTasks();
      } else {
        alert('Failed to complete step: ' + (res.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting((prev) => ({ ...prev, [task.step_id]: false }));
    }
  };

  if (error) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={isMobile ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : null}
      >

        {allTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={64} color="#94A3B8" />
            <Text style={styles.emptyText}>All tasks completed!</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* TABLE HEADER */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.taskCol]}>Task</Text>
              <Text style={[styles.tableCell, styles.plannedCol]}>Planned</Text>
              <Text style={[styles.tableCell, styles.actionCol]}>Action</Text>
            </View>

          {/* TABLE ROWS */}
          <>
          {allTasks.map((task, idx) => {
            const isChecklist = task._type === 'checklist';
            const key = isChecklist ? `checklist-${task.assignment_id}-${idx}` : `fms-${task.step_id}-${idx}`;
            
            let taskTitle = '';
            let taskDescription = '';
            let requiresPhoto = false;
            const taskId = isChecklist ? task.assignment_id : task.step_id;

            if (isChecklist) {
              const checklistName = typeof task.task_name === 'string' && task.task_name.trim() !== '' && task.task_name !== '0'
                ? task.task_name
                : (typeof task.title === 'string' && task.title.trim() !== '' ? task.title : null);
              
              if (!checklistName) return null;
              
              taskTitle = checklistName;
              requiresPhoto = task.requires_photo === 1;
              
              if (task.fields && typeof task.fields === 'object') {
                taskDescription = Object.entries(task.fields)
                  .filter(([k, v]) => v !== 0 && v !== null && v !== undefined && v !== '')
                  .map(([k, v]) => `${formatFieldName(k)}: ${v}`)
                  .join(', ');
              }
            } else {
              taskTitle = task.step_name || 'FMS Task';
              let instanceFields = '';
              if (task.form_data) {
                try {
                  const parsedInstance = typeof task.form_data === 'string' ? JSON.parse(task.form_data) : task.form_data;
                  instanceFields = Object.entries(parsedInstance)
                    .map(([k, v]) => `${formatFieldName(k)}: ${v}`)
                    .join(', ');
                } catch (e) {
                  instanceFields = '';
                }
              }
              taskDescription = instanceFields;
            }

            return (
              <Surface key={key} style={styles.tableRow}>
                <View style={styles.taskColContent}>
                  <View style={styles.taskNameSection}>
                    <Text style={styles.taskName}>{taskTitle}</Text>
                    {taskDescription && (
                      <Text style={styles.taskDescription} numberOfLines={2}>
                        {taskDescription}
                      </Text>
                    )}
                    {requiresPhoto && (
                      <View style={styles.photoTag}>
                        <Ionicons name="camera" size={12} color="#DC2626" />
                        <Text style={styles.photoTagText}>Photo required</Text>
                      </View>
                    )}
                  </View>

                  {isChecklist && photos[task.assignment_id] && (
                    <View style={styles.photoPreview}>
                      <Image
                        source={{ uri: photos[task.assignment_id] }}
                        style={styles.previewImage}
                      />
                      <TouchableOpacity
                        onPress={() => setPhotos((prev) => ({ ...prev, [task.assignment_id]: null }))}
                        style={styles.removePhotoBtn}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.typeColContent}>
                  <Text style={styles.plannedDate}>
                    {isChecklist 
                      ? (task.scheduled_date ? new Date(task.scheduled_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')
                      : (task.planned_at ? new Date(task.planned_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')
                    }
                  </Text>
                </View>

                <View style={styles.actionColContent}>
                  {isChecklist ? (
                    <>
                      {requiresPhoto && (
                        <TouchableOpacity
                          style={[styles.photoBtn, photos[task.assignment_id] && styles.photoBtnActive]}
                          onPress={() => pickPhoto(task.assignment_id)}
                        >
                          <Ionicons
                            name={photos[task.assignment_id] ? "checkmark-circle" : "camera"}
                            size={18}
                            color={photos[task.assignment_id] ? '#10B981' : '#64748B'}
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.completeBtn, requiresPhoto && !photos[task.assignment_id] && styles.completeBtnDisabled]}
                        onPress={() => submitChecklistTask(task, 'done')}
                        disabled={(requiresPhoto && !photos[task.assignment_id]) || submitting[task.assignment_id]}
                      >
                        {submitting[task.assignment_id] ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                      {/* NA Button for all checklist tasks */}
                      <TouchableOpacity
                        style={[styles.completeBtn, { backgroundColor: '#F59E0B', marginLeft: 6 }]}
                        onPress={() => submitChecklistTask(task, 'na')}
                        disabled={submitting[task.assignment_id]}
                      >
                        {submitting[task.assignment_id] ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 3 }} />
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>NA</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => submitFmsTask(task)}
                      disabled={submitting[taskId]}
                    >
                      {submitting[taskId] ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </Surface>
            );
          }).filter(Boolean)}
          </>
        </View>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 12,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  /* TABLE STYLES */
  tableContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  tableCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  taskCol: {
    flex: 2,
  },
  plannedCol: {
    flex: 0.8,
  },
  actionCol: {
    flex: 0.9,
  },

  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  taskColContent: {
    flex: 2,
    marginRight: 8,
  },
  taskNameSection: {
    marginBottom: 8,
  },
  taskName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 6,
    lineHeight: 16,
  },
  photoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  photoTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#DC2626",
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#000000",
    borderRadius: 10,
    padding: 2,
    opacity: 0.7,
  },

  typeColContent: {
    flex: 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  plannedDate: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
    textAlign: "center",
  },

  actionColContent: {
    flex: 0.9,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtnActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#0284C7",
  },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  completeBtnDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },

  emptyContainer: {
    marginTop: 40,
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
  },

  // Error
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "600",
  },
});


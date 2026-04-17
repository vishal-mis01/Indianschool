
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  RefreshControl,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { DataTable, Button, Surface, Chip } from "react-native-paper";
import apiFetch from "./apiFetch";


export default function ProcessCoordinatorDashboard({ user, onLogout }) {
  const [todayTasks, setTodayTasks] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [marking, setMarking] = useState({});
  const debugError = Array.isArray(debugInfo) ? debugInfo.find((d) => d && d.error)?.error : null;
  const [active, setActive] = useState("tasks"); // tasks | lessons | unassigned
  const [lessonsData, setLessonsData] = useState({});
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [unassignedError, setUnassignedError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterClass, setFilterClass] = useState("all");
  const [taskUserId, setTaskUserId] = useState("all");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    if (!user || !user.user_id) return;

    // Ensure we always have a selected user for task filtering
    setTaskUserId((prev) => prev || user.user_id);

    loadUserList();
    loadMonitoringData();
  }, [user]);

  useEffect(() => {
    if (!user || !user.user_id) return;

    // Always refresh tasks/monitoring periodically for the process coordinator role
    const refresh = () => {
      loadTodayTasks(user.user_id);
      loadMonitoringData();
      loadUnassignedUsers();
    };

    // Initial load
    refresh();

    const interval = setInterval(() => {
      refresh();
    }, 100000); // refresh every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  const loadTodayTasks = async (user_id) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/get_user_checklist.php?user_id=${user_id}&role=${user.role}`);
      const tasks = res.tasks || [];
      setTodayTasks(tasks);
      setDebugInfo(res.debug || null);
    } catch (e) {
      setError("Failed to load today's tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadUserList = async () => {
    try {
      const data = await apiFetch("/admin_get_users.php");
      const userList = Array.isArray(data) ? data : (data && data.users ? data.users : []);
      setUsers(userList);
      if (!taskUserId && userList.length > 0) {
        setTaskUserId(userList[0].id);
        loadTodayTasks(userList[0].id);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadMonitoringData = async () => {
    try {
      const lessonsRes = await apiFetch("/get_lessons_taught_today.php");

      if (lessonsRes && lessonsRes.success) {
        // Group lessons by class, then by subject
        const groupedData = {};
        lessonsRes.data.forEach((item) => {
          if (!groupedData[item.class_name]) {
            groupedData[item.class_name] = {};
          }
          if (!groupedData[item.class_name][item.subject_name]) {
            groupedData[item.class_name][item.subject_name] = [];
          }
          groupedData[item.class_name][item.subject_name].push(item);
        });
        setLessonsData(groupedData);
      }

      setRefreshing(false);
    } catch (error) {
      console.error("Error loading monitoring data:", error);
      Alert.alert("Error", "Failed to load monitoring data");
      setRefreshing(false);
    }
  };

  const loadUnassignedUsers = async () => {
    try {
      setUnassignedError("");
      setUnassignedUsers([]);

      // First check if database is properly set up
      const checkRes = await apiFetch("/check_database_setup.php");
      if (!checkRes.table_exists) {
        const message = "The user_syllabus_progress table does not exist. Please run USER_SYLLABUS_PROGRESS_TABLE.sql in your database.";
        setUnassignedError(message);
        Alert.alert("Database Setup Required", message, [{ text: "OK" }]);
        return;
      }

      const res = await apiFetch("/get_users_without_chapter_assignments.php");
      if (res && res.success) {
        setUnassignedUsers(res.data || []);
      } else {
        const message = res?.error || "Unknown API error while fetching unassigned users.";
        setUnassignedError(message);
      }
    } catch (error) {
      console.error("Error loading unassigned users:", error);
      const message = error?.message || "Failed to load users without chapter assignments";
      setUnassignedError(message);
      Alert.alert("Error", message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const apiUserId = taskUserId === "all" ? (user?.user_id || null) : taskUserId;
    if (apiUserId) {
      await loadTodayTasks(apiUserId);
    }
    await loadMonitoringData();
    await loadUnassignedUsers();
  };

  // Filter lessons by class
  const filteredLessons = filterClass === "all"
    ? lessonsData
    : {
        [filterClass]: lessonsData[filterClass] || {},
      };

  const classList = Object.keys(lessonsData);

  // Count total assignments
  const totalAssignments = Object.values(filteredLessons).reduce((total, classData) => {
    return total + Object.values(classData).reduce((classTotal, subjectData) => classTotal + subjectData.length, 0);
  }, 0);

  const renderTasksTab = () => {
    const filteredTasks =
      taskUserId && taskUserId !== "all"
        ? (() => {
            const normalizedSelected = String(taskUserId).trim();
            const selectedUser = users.find((u) => String(u.id) === normalizedSelected);
            const selectedName = selectedUser ? String(selectedUser.name || "").toLowerCase().trim() : null;

            return todayTasks.filter((t) => {
              const assignedId = String(t.assigned_user_id || t.user_id || "").trim();
              const userName = String(t.user_name || "").toLowerCase().trim();

              const matchesId = assignedId && assignedId === normalizedSelected;
              const matchesName = selectedName && userName && userName.includes(selectedName);

              return matchesId || matchesName;
            });
          })()
        : todayTasks;

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'flex-start', paddingBottom: 80 }}>
        <View style={[styles.innerContainer, { alignItems: 'center' }]}> 
          <Text style={styles.heading}>Today's Tasks</Text>
          <Button mode="text" onPress={onLogout} style={{ marginLeft: "auto", alignSelf: 'flex-end', marginBottom: 10 }}>Logout</Button>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Show tasks for:</Text>
            <View style={[styles.pickerWrapper, isMobile ? { width: '100%' } : { width: 320 }]}>
              <Picker
                selectedValue={taskUserId}
                onValueChange={(value) => {
                  setTaskUserId(value);
                }}
                style={styles.picker}
              >
                <Picker.Item label="All users" value="all" />
                {users.map((user) => (
                  <Picker.Item key={user.id} label={user.name || `User ${user.id}`} value={user.id} />
                ))}
              </Picker>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={{ color: "red", marginTop: 20 }}>{error}</Text>
          ) : (
            <ScrollView horizontal>
              <View style={{ minWidth: 600 }}>
                <View style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                  <DataTable.Header style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 3, minWidth: 600 }}>
                    <DataTable.Title textStyle={styles.headerText}>User</DataTable.Title>
                    <DataTable.Title textStyle={styles.headerText}>Task</DataTable.Title>
                    <DataTable.Title textStyle={styles.headerText}>Frequency</DataTable.Title>
                    <DataTable.Title textStyle={styles.headerText}>Requires Photo</DataTable.Title>
                    <DataTable.Title textStyle={styles.headerText}>Scheduled Date</DataTable.Title>
                    <DataTable.Title textStyle={styles.headerText}>Status</DataTable.Title>
                  </DataTable.Header>
                </View>
                {filteredTasks.length === 0 ? (
                  <>
                    <DataTable.Row>
                      <DataTable.Cell>
                        <Text style={{ color: "#000" }}>No pending tasks for today</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                    {debugError ? (
                      <View style={{ marginTop: 20 }}>
                        <Text style={{ fontWeight: 'bold' }}>Debug Info:</Text>
                        <ScrollView horizontal style={{ maxHeight: 200 }}>
                          <Text selectable style={{ fontSize: 12, color: '#333', backgroundColor: '#f5f5f5', padding: 8 }}>
                            {debugError}
                          </Text>
                        </ScrollView>
                      </View>
                    ) : null}
                  </>
                ) : (
                  filteredTasks.map((task, idx) => (
                    <DataTable.Row key={task.assignment_id || `task-${idx}`}>
                      <DataTable.Cell>
                        <Text style={styles.cellText}>{task.user_name}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={styles.cellText}>{task.title}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={styles.cellText}>{task.frequency}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={styles.cellText}>{task.requires_photo ? 'Yes' : 'No'}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={styles.cellText}>{task.scheduled_date}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        {task.status === 'completed' ? (
                          <Chip icon="check-circle" mode="flat" style={{ backgroundColor: '#4CAF50' }}>
                            Done
                          </Chip>
                        ) : (
                          <Chip icon="clock-outline" mode="outlined">
                            Pending
                          </Chip>
                        )}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderLessonsTab = () => (
    <View style={styles.tabContent}>
      <Surface style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Class:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={filterClass === "all"}
            onPress={() => setFilterClass("all")}
            style={styles.chip}
            mode={filterClass === "all" ? "flat" : "outlined"}
          >
            All Classes
          </Chip>
          {classList.map((className) => (
            <Chip
              key={className}
              selected={filterClass === className}
              onPress={() => setFilterClass(className)}
              style={styles.chip}
              mode={filterClass === className ? "flat" : "outlined"}
            >
              {className}
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      {Object.keys(filteredLessons).length === 0 ? (
        <Surface style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No assignments for today</Text>
        </Surface>
      ) : (
        <ScrollView>
          {Object.keys(filteredLessons).map((className) => (
            <View key={className} style={styles.classSection}>
              <Text style={styles.classTitle}>{className}</Text>
              {Object.keys(filteredLessons[className]).map((subjectName) => (
                <View key={subjectName} style={styles.subjectSection}>
                  <Text style={styles.subjectTitle}>{subjectName}</Text>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, styles.tableCellChapter, styles.headerCell]}>Chapter</Text>
                    <Text style={[styles.tableCell, styles.tableCellTopic, styles.headerCell]}>Topic</Text>
                    <Text style={[styles.tableCell, styles.tableCellSubtopic, styles.headerCell]}>Subtopic</Text>
                    <Text style={[styles.tableCell, styles.tableCellActivity, styles.headerCell]}>Activity</Text>
                    <Text style={[styles.tableCell, styles.tableCellUser, styles.headerCell]}>User</Text>
                    <Text style={[styles.tableCell, styles.tableCellStatus, styles.headerCell]}>Status</Text>
                  </View>
                  {filteredLessons[className][subjectName].map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.tableCellChapter]}>{item.chapter_name || `Chapter ${item.chapter_no}`}</Text>
                      <Text style={[styles.tableCell, styles.tableCellTopic]}>{item.topic}</Text>
                      <Text style={[styles.tableCell, styles.tableCellSubtopic]}>{item.sub_topic}</Text>
                      <Text style={[styles.tableCell, styles.tableCellActivity]}>{item.activity || '-'}</Text>
                      <Text style={[styles.tableCell, styles.tableCellUser]}>{item.user_name}</Text>
                      <View style={[styles.tableCell, styles.tableCellStatus]}>
                        {item.status === 'completed' ? (
                          <Chip icon="check-circle" mode="flat" style={{ backgroundColor: '#4CAF50' }}>
                            Done
                          </Chip>
                        ) : (
                          <Chip icon="clock-outline" mode="outlined">
                            Pending
                          </Chip>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderUnassignedTab = () => (
    <View style={styles.tabContent}>
      <Surface style={styles.filterContainer}>
        <Text style={styles.sectionTitle}>Users Without Chapter Assignments Today</Text>
        <Text style={styles.sectionSubtitle}>
          These users have subject assignments but haven't assigned any chapters today
        </Text>
      </Surface>

      {unassignedError ? (
        <Surface style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load unassigned users</Text>
          <Text style={styles.errorText}>{unassignedError}</Text>
        </Surface>
      ) : unassignedUsers.length === 0 ? (
        <Surface style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found who currently need chapter assignment today.</Text>
          <Text style={styles.emptyText}>If this is unexpected, verify that the user_syllabus_progress table exists and that users have assigned subjects.</Text>
        </Surface>
      ) : (
        <ScrollView>
          {unassignedUsers.map((user) => (
            <Surface key={user.user_id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View>
                  <Text style={styles.userName}>{user.user_name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <Chip mode="outlined" style={styles.subjectsChip}>
                  {user.assigned_subjects_count} subject{user.assigned_subjects_count !== 1 ? 's' : ''}
                </Chip>
              </View>
              <View style={styles.subjectsContainer}>
                <Text style={styles.subjectsLabel}>Assigned Subjects:</Text>
                <Text style={styles.subjectsText}>{user.assigned_subjects}</Text>
              </View>
            </Surface>
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Process Coordinator Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <Button
            mode="outlined"
            onPress={onLogout}
            style={styles.logoutBtn}
            labelStyle={{ fontSize: 12 }}
          >
            Logout
          </Button>
        </View>
      </Surface>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <Button
          mode={active === "tasks" ? "contained" : "text"}
          onPress={() => setActive("tasks")}
          style={[
            styles.tabButton,
            active === "tasks" && styles.activeTabButton,
          ]}
          labelStyle={styles.tabLabel}
        >
          Tasks ({todayTasks.length})
        </Button>
        <Button
          mode={active === "lessons" ? "contained" : "text"}
          onPress={() => setActive("lessons")}
          style={[
            styles.tabButton,
            active === "lessons" && styles.activeTabButton,
          ]}
          labelStyle={styles.tabLabel}
        >
          Lessons ({totalAssignments})
        </Button>
        <Button
          mode={active === "unassigned" ? "contained" : "text"}
          onPress={() => setActive("unassigned")}
          style={[
            styles.tabButton,
            active === "unassigned" && styles.activeTabButton,
          ]}
          labelStyle={styles.tabLabel}
        >
          Unassigned ({unassignedUsers.length})
        </Button>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {active === "tasks"
          ? renderTasksTab()
          : active === "lessons"
          ? renderLessonsTab()
          : renderUnassignedTab()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },

  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    backgroundColor: "#fff",
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  logoutBtn: {
    borderColor: "#d32f2f",
  },

  tabNavigation: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 8,
  },

  tabButton: {
    flex: 1,
    borderRadius: 0,
    marginHorizontal: 4,
  },

  activeTabButton: {
    backgroundColor: "#0066cc",
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  innerContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff",
  },

  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },

  headerText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },

  cellText: {
    color: "#000",
    fontSize: 14,
  },

  filterContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  pickerContainer: {
    width: "100%",
    marginBottom: 16,
  },

  pickerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },

  pickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
    maxWidth: 360,
    minWidth: 200,
  },

  picker: {
    width: "100%",
    height: 44,
    color: "#000",
  },

  chip: {
    marginRight: 8,
    marginBottom: 8,
  },

  emptyContainer: {
    padding: 24,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },

  classSection: {
    marginBottom: 16,
  },

  classTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    paddingHorizontal: 12,
  },

  subjectSection: {
    marginBottom: 12,
  },

  subjectTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    marginBottom: 8,
    paddingHorizontal: 12,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 4,
  },

  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 2,
    elevation: 1,
  },

  tableCell: {
    fontSize: 12,
    color: "#333",
  },

  tableCellChapter: {
    flex: 1.5,
    fontWeight: "500",
  },

  tableCellTopic: {
    flex: 2,
  },

  tableCellSubtopic: {
    flex: 1.5,
  },

  tableCellActivity: {
    flex: 1,
  },

  tableCellUser: {
    flex: 1,
  },

  tableCellStatus: {
    flex: 1,
    alignItems: "flex-start",
  },

  headerCell: {
    fontWeight: "600",
    color: "#000",
  },

  taskCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 2,
  },

  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },

  pendingChip: {
    backgroundColor: "#ff9800",
  },

  divider: {
    marginVertical: 8,
  },

  taskDetails: {
    gap: 4,
  },

  taskDetail: {
    fontSize: 13,
    color: "#666",
  },

  detailLabel: {
    fontWeight: "500",
    color: "#333",
  },

  bottomPadding: {
    height: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },

  userCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 2,
  },

  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },

  userEmail: {
    fontSize: 14,
    color: "#666",
  },

  subjectsChip: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffc107",
  },

  subjectsContainer: {
    marginTop: 8,
  },

  subjectsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },

  subjectsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  errorContainer: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#fdecea",
    borderWidth: 1,
    borderColor: "#f5c6cb",
    marginVertical: 12,
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#c62828",
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    color: "#8a1f1f",
    lineHeight: 20,
  },
});

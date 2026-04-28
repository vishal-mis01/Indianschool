import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Surface,
  Button,
  Text,
  ActivityIndicator,
  Chip,
  Divider,
  DataTable,
} from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import apiFetch from "./apiFetch";

export default function EDashboard({ user, onLogout }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [activeTab, setActiveTab] = useState("tasks"); // tasks | lessons | pending_tasks
  const [lessonsData, setLessonsData] = useState({});
  const [pendingTasksData, setPendingTasksData] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [marking, setMarking] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterClass, setFilterClass] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [taskUserId, setTaskUserId] = useState("all");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [usersFilter, setUsersFilter] = useState([]);
  const [classList, setClassList] = useState([]);

  useEffect(() => {
    if (!user || !user.user_id) return;

    // Ensure we always have a selected user for task filtering
    setTaskUserId((prev) => prev || user.user_id);

    loadUserList();
    loadData();
  }, [user]);

  useEffect(() => {
    if (!user || !user.user_id) return;

    // Always refresh tasks/monitoring periodically for the EA role
    const refresh = () => {
      loadTodayTasks(user.user_id);
      loadData();
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
      const res = await apiFetch(`/get_user_checklist.php?user_id=${user_id}&role=process_coordinator`);
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [lessonsRes, tasksRes] = await Promise.all([
        apiFetch("/get_pending_lessons.php"),
        apiFetch("/get_pending_tasks_today.php"),
      ]);

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
        // Extract unique classes for filter
        const uniqueClasses = Object.keys(groupedData);
        setClassList(uniqueClasses);
      }

      if (tasksRes && tasksRes.success) {
        setPendingTasksData(tasksRes.data || []);
        // Extract unique users for filter
        const uniqueUsers = [...new Set(tasksRes.data.map((t) => t.user_id))];
        setUsersFilter(uniqueUsers);
      }

      setRefreshing(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
      setRefreshing(false);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const apiUserId = taskUserId === "all" ? (user?.user_id || null) : taskUserId;
    if (apiUserId) {
      await loadTodayTasks(apiUserId);
    }
    await loadData();
  };

  // Filter lessons by class
  const filteredLessons = filterClass === "all" 
    ? lessonsData 
    : {
        [filterClass]: lessonsData[filterClass] || {},
      };

  // Count total assignments
  const totalAssignments = Object.values(filteredLessons).reduce((total, classData) => {
    return total + Object.values(classData).reduce((classTotal, subjectData) => classTotal + subjectData.length, 0);
  }, 0);

  // Filter pending tasks
  const filteredTasks = filterUser === "all"
    ? pendingTasksData
    : pendingTasksData.filter((t) => String(t.user_id) === String(filterUser));

  const renderTasksTab = () => {
    const debugError = Array.isArray(debugInfo) ? debugInfo.find((d) => d && d.error)?.error : null;
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

          <View style={[styles.pickerContainer, { alignSelf: 'center' }]}>
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
                  <DataTable.Header style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 3, minWidth: 700 }}>
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
                        <Text style={{ color: "#000" }}>No tasks for today</Text>
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
          <Text style={styles.emptyText}>No pending lessons</Text>
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
                    <Text style={[styles.tableCell, styles.tableCellPlannedDate, styles.headerCell]}>Planned Date</Text>
                    <Text style={[styles.tableCell, styles.tableCellStatus, styles.headerCell]}>Status</Text>
                  </View>
                  {filteredLessons[className][subjectName].map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.tableCellChapter]}>{item.chapter_name || `Chapter ${item.chapter_no}`}</Text>
                      <Text style={[styles.tableCell, styles.tableCellTopic]}>{item.topic}</Text>
                      <Text style={[styles.tableCell, styles.tableCellSubtopic]}>{item.sub_topic}</Text>
                      <Text style={[styles.tableCell, styles.tableCellActivity]}>{item.activity || '-'}</Text>
                      <Text style={[styles.tableCell, styles.tableCellUser]}>{item.user_name}</Text>
                      <Text style={[styles.tableCell, styles.tableCellPlannedDate]}>{item.planned_date || '-'}</Text>
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

  const renderPendingTasksTab = () => (
    <View style={styles.tabContent}>
      <Surface style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by User:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={filterUser === "all"}
            onPress={() => setFilterUser("all")}
            style={styles.chip}
            mode={filterUser === "all" ? "flat" : "outlined"}
          >
            All Users
          </Chip>
          {usersFilter.map((userId) => (
            <Chip
              key={userId}
              selected={String(filterUser) === String(userId)}
              onPress={() => setFilterUser(String(userId))}
              style={styles.chip}
              mode={String(filterUser) === String(userId) ? "flat" : "outlined"}
            >
              User {userId}
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      {filteredTasks.length === 0 ? (
        <Surface style={styles.emptyContainer}>
          <Text style={styles.emptyText}>All tasks are completed!</Text>
        </Surface>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={filteredTasks}
          keyExtractor={(item, index) => `task-${index}`}
          renderItem={({ item }) => (
            <Surface style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle} numberOfLines={2}>
                  {item.task_title || "Task"}
                </Text>
                <Chip
                  icon="clock-outline"
                  style={styles.pendingChip}
                  textStyle={{ color: "#fff" }}
                  mode="flat"
                >
                  Pending
                </Chip>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.taskDetails}>
                <Text style={styles.taskDetail}>
                  <Text style={styles.detailLabel}>Assigned To:</Text> {item.user_name || "User #" + item.user_id}
                </Text>
                <Text style={styles.taskDetail}>
                  <Text style={styles.detailLabel}>Department:</Text> {item.department || "N/A"}
                </Text>
                <Text style={styles.taskDetail}>
                  <Text style={styles.detailLabel}>Frequency:</Text> {item.frequency || "One-time"}
                </Text>
                <Text style={styles.taskDetail}>
                  <Text style={styles.detailLabel}>Due Date:</Text> {item.due_date || new Date().toLocaleDateString()}
                </Text>
                {item.days_overdue > 0 && (
                  <Text style={{ ...styles.taskDetail, color: "#d32f2f" }}>
                    <Text style={{ ...styles.detailLabel, color: "#d32f2f" }}>Overdue:</Text> {item.days_overdue} days
                  </Text>
                )}
              </View>
            </Surface>
          )}
        />
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
            <Text style={styles.headerTitle}>
              {user.role === "md" ? "Managing Director" : "Executive Assistant"} Dashboard
            </Text>
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
          mode={activeTab === "tasks" ? "contained" : "text"}
          onPress={() => setActiveTab("tasks")}
          style={[
            styles.tabButton,
            activeTab === "tasks" && styles.activeTabButton,
          ]}
          contentStyle={styles.tabButtonContent}
          labelStyle={styles.tabLabel}
        >
          Tasks ({todayTasks.length})
        </Button>
        <Button
          mode={activeTab === "lessons" ? "contained" : "text"}
          onPress={() => setActiveTab("lessons")}
          style={[
            styles.tabButton,
            activeTab === "lessons" && styles.activeTabButton,
          ]}
          contentStyle={styles.tabButtonContent}
          labelStyle={styles.tabLabel}
        >
          Pending Lessons ({totalAssignments})
        </Button>
        <Button
          mode={activeTab === "pending_tasks" ? "contained" : "text"}
          onPress={() => setActiveTab("pending_tasks")}
          style={[
            styles.tabButton,
            activeTab === "pending_tasks" && styles.activeTabButton,
          ]}
          contentStyle={styles.tabButtonContent}
          labelStyle={styles.tabLabel}
        >
          Pending Tasks ({filteredTasks.length})
        </Button>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "tasks" ? renderTasksTab() : activeTab === "lessons" ? renderLessonsTab() : renderPendingTasksTab()}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 8,
  },

  tabButton: {
    borderRadius: 20,
    minWidth: 80,
    overflow: "hidden",
  },

  tabButtonContent: {
    height: 36,
    paddingHorizontal: 12,
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

  tabContent: {},

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

  chip: {
    marginRight: 8,
    marginBottom: 8,
  },

  lessonCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 2,
  },

  taskCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 2,
  },

  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  lessonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },

  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },

  statusChip: {
    backgroundColor: "#4caf50",
  },

  pendingChip: {
    backgroundColor: "#ff9800",
  },

  divider: {
    marginVertical: 8,
  },

  lessonDetails: {},

  taskDetails: {},

  lessonDetail: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    marginBottom: 6,
  },

  taskDetail: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    marginBottom: 6,
  },

  detailLabel: {
    fontWeight: "600",
    color: "#333",
  },

  emptyContainer: {
    marginTop: 32,
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },

  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },

  innerContainer: {
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 16,
  },

  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
    maxWidth: 360,
    minWidth: 200,
    alignSelf: 'center',
  },

  picker: {
    width: "100%",
    height: 44,
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

  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },

  bottomPadding: {
    height: 24,
  },

  classSection: {
    marginBottom: 24,
  },

  classTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  subjectSection: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    elevation: 2,
    marginHorizontal: 8,
  },

  subjectTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E3F2FD",
    borderBottomWidth: 1,
    borderBottomColor: "#BBDEFB",
  },

  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  tableCell: {
    fontSize: 12,
    color: "#475569",
    paddingHorizontal: 4,
  },

  tableCellChapter: { flex: 2 },
  tableCellTopic: { flex: 2 },
  tableCellSubtopic: { flex: 2 },
  tableCellActivity: { flex: 1.5 },
  tableCellUser: { flex: 1.5 },
  tableCellPlannedDate: { flex: 1.2 },
  tableCellStatus: { flex: 1 },

  headerCell: {
    fontWeight: "700",
    color: "#1E293B",
  },
});

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
import { DataTable, Button, Surface, Chip, TextInput } from "react-native-paper";
import apiFetch from "./apiFetch";


export default function ProcessCoordinatorDashboard({ user, onLogout }) {
  const [todayTasks, setTodayTasks] = useState([]);
  const [debugInfo, setDebugInfo] = useState(null);
  const [marking, setMarking] = useState({});
  const debugError = Array.isArray(debugInfo) ? debugInfo.find((d) => d && d.error)?.error : null;
  const [active, setActive] = useState("tasks"); // tasks | lessons | unassigned
  const [lessonsData, setLessonsData] = useState({});
  const [pendingLessonPlans, setPendingLessonPlans] = useState([]);
  const [todayPendingLessons, setTodayPendingLessons] = useState([]);
  const [todayPendingCount, setTodayPendingCount] = useState(0);
  const [unassignedUsers, setUnassignedUsers] = useState([]);
  const [unassignedError, setUnassignedError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterClass, setFilterClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [taskUserId, setTaskUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | completed
  const todayIso = new Date().toISOString().split('T')[0];
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
    loadMonitoringData();
  }, [selectedDate, user]);

  useEffect(() => {
    if (!user || !user.user_id) return;

    const refresh = () => {
      loadTodayTasks(user.user_id);
      loadMonitoringData();
      loadUnassignedUsers();
    };

    // Initial load
    refresh();
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
      const [lessonsRes, pendingRes] = await Promise.all([
        apiFetch(`/get_lessons_taught_today.php?date=${selectedDate}`).catch(err => {
          console.warn("⚠️ Could not load lessons:", err.message);
          return { success: false };
        }),
        apiFetch("/get_pending_lessons.php").catch(err => {
          console.warn("⚠️ Could not load pending lessons (endpoint may not exist):", err.message);
          return { success: false, data: [] };
        }),
      ]);

      if (lessonsRes?.success && lessonsRes.data) {
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

        const pendingForDate = lessonsRes.data.filter((item) => {
          return item.planned_date === selectedDate && item.status !== 'completed';
        });
        setTodayPendingLessons(pendingForDate);
        setTodayPendingCount(pendingForDate.length);
      } else {
        setLessonsData({});
        setTodayPendingLessons([]);
        setTodayPendingCount(0);
      }

      if (pendingRes && pendingRes.success) {
        setPendingLessonPlans(pendingRes.data || []);
      } else {
        setPendingLessonPlans([]);
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
    const apiUserId = taskUserId || user?.user_id || null;
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

  useEffect(() => {
    if (filterClass === "all") {
      setSelectedSubject("all");
      return;
    }
    const subjectsForClass = Object.keys(lessonsData[filterClass] || {});
    if (!subjectsForClass.includes(selectedSubject)) {
      setSelectedSubject("all");
    }
  }, [filterClass, lessonsData, selectedSubject]);

  // Count total assignments
  const totalAssignments = Object.values(filteredLessons).reduce((total, classData) => {
    return total + Object.values(classData).reduce((classTotal, subjectData) => classTotal + subjectData.length, 0);
  }, 0);

  const formatDateString = (dateString) => {
    if (!dateString) return "-";
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return "-";
    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderTasksTab = () => {
    let filteredTasks =
      taskUserId
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
                {users.map((userItem) => (
                  <Picker.Item key={userItem.id} label={userItem.name || `User ${userItem.id}`} value={userItem.id} />
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
                        <Text style={styles.cellText}>{formatDateString(task.scheduled_date)}</Text>
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

  const renderLessonsTab = () => {
    // Get all lessons from lessonsData (only for the selected date now)
    const allLessons = Object.values(lessonsData).flatMap((classData) =>
      Object.values(classData).flat()
    );

    // Count pending and done for the selected date
    // Check status field, with fallback to completed_date if status is null/not_assigned
    const pendingLessons = allLessons.filter(item => {
      return item.status === 'pending' || (item.status !== 'completed' && !item.completed_date);
    });
    const currentDatePending = pendingLessons.length;
    const currentDateDone = allLessons.filter(item => {
      return item.status === 'completed' || (item.completed_date && item.completed_date !== null);
    }).length;

    const filteredByClass = filterClass === "all"
      ? allLessons
      : allLessons.filter((item) => item.class_name === filterClass);

    const filteredBySubject = selectedSubject === "all"
      ? filteredByClass
      : filteredByClass.filter((item) => item.subject_name === selectedSubject);

    // Apply status filter
    const lessonsByStatus = filteredBySubject.filter(item => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") {
        return item.status === 'pending' || (item.status !== 'completed' && !item.completed_date);
      }
      if (statusFilter === "completed") {
        return item.status === 'completed' || (item.completed_date && item.completed_date !== null);
      }
      return false;
    });

    // Group by class and subject
    const visibleLessons = {};
    lessonsByStatus.forEach((item) => {
      if (!visibleLessons[item.class_name]) {
        visibleLessons[item.class_name] = {};
      }
      if (!visibleLessons[item.class_name][item.subject_name]) {
        visibleLessons[item.class_name][item.subject_name] = [];
      }
      visibleLessons[item.class_name][item.subject_name].push(item);
    });

    const todayLessonCount = allLessons.length;
    const pendingLabel = currentDatePending === 1 ? 'pending lesson' : 'pending lessons';

    return (
      <View style={styles.tabContent}>
        <Surface style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Lesson plan for {selectedDate}</Text>
          <Text style={styles.summaryText}>
            {todayLessonCount} lesson{todayLessonCount === 1 ? '' : 's'} scheduled, {currentDatePending} {pendingLabel} still pending.
          </Text>

          <View style={styles.pendingList}>
            {pendingLessons.length > 0 ? (
              pendingLessons.slice(0, 8).map((item, idx) => (
                <Text key={`${item.class_name}-${item.subject_name}-${item.topic}-${idx}`} style={styles.pendingItem}>
                  • {item.class_name} / {item.subject_name} / {item.topic} {item.sub_topic ? `- ${item.sub_topic}` : ''}
                </Text>
              ))
            ) : (
              <Text style={styles.pendingItem}>No pending lesson plans for this date. All assigned items are complete or not scheduled today.</Text>
            )}
            {pendingLessons.length > 8 ? (
              <Text style={[styles.pendingItem, { fontStyle: 'italic', color: '#475569' }]}>+{pendingLessons.length - 8} more pending plans</Text>
            ) : null}
          </View>
        </Surface>

        <Surface style={[styles.filterContainer, { marginTop: 12 }]}> 
          <Text style={styles.filterLabel}>All pending syllabus plans</Text>
          {pendingLessonPlans.length > 0 ? (
            pendingLessonPlans.slice(0, 8).map((item, idx) => (
              <Text key={`${item.class_subject_id}-${item.chapter_no}-${idx}`} style={styles.pendingItem}>
                • [{item.class_subject_id}] {item.class_name} / {item.subject_name} / {item.topic} {item.sub_topic ? `- ${item.sub_topic}` : ''}
              </Text>
            ))
          ) : (
            <Text style={styles.pendingItem}>No pending syllabus lesson plans found.</Text>
          )}
          {pendingLessonPlans.length > 8 ? (
            <Text style={[styles.pendingItem, { fontStyle: 'italic', color: '#475569' }]}>+{pendingLessonPlans.length - 8} more syllabus pending plans</Text>
          ) : null}
        </Surface>

        <Surface style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Select Date:</Text>
          <TextInput
            mode="outlined"
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            style={[styles.dateInput, isMobile ? { width: '100%' } : { width: 200 }]}
          />
        </Surface>

        <Surface style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              selected={statusFilter === "all"}
              onPress={() => setStatusFilter("all")}
              style={styles.chip}
              mode={statusFilter === "all" ? "flat" : "outlined"}
            >
              All ({Object.values(visibleLessons).reduce((total, classData) => total + Object.values(classData).reduce((count, items) => count + items.length, 0), 0)})
            </Chip>
            <Chip
              selected={statusFilter === "pending"}
              onPress={() => setStatusFilter("pending")}
              style={styles.chip}
              mode={statusFilter === "pending" ? "flat" : "outlined"}
            >
              Pending
            </Chip>
            <Chip
              selected={statusFilter === "completed"}
              onPress={() => setStatusFilter("completed")}
              style={styles.chip}
              mode={statusFilter === "completed" ? "flat" : "outlined"}
            >
              Completed
            </Chip>
          </ScrollView>
        </Surface>

        <Surface style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Class:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              selected={filterClass === "all"}
              onPress={() => {
                setFilterClass("all");
                setSelectedSubject("all");
              }}
              style={styles.chip}
              mode={filterClass === "all" ? "flat" : "outlined"}
            >
              All Classes
            </Chip>
            {Object.keys(lessonsData).map((className) => (
              <Chip
                key={className}
                selected={filterClass === className}
                onPress={() => {
                  setFilterClass(className);
                  setSelectedSubject("all");
                }}
                style={styles.chip}
                mode={filterClass === className ? "flat" : "outlined"}
              >
                {className}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        {filterClass !== "all" && Object.keys(lessonsData[filterClass] || {}).length > 0 && (
          <Surface style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by Subject:</Text>
            <View style={[styles.pickerWrapper, isMobile ? { width: '100%' } : { width: 260 }]}> 
              <Picker
                selectedValue={selectedSubject}
                onValueChange={(value) => setSelectedSubject(value)}
                style={styles.picker}
              >
                <Picker.Item label="All subjects" value="all" />
                {Object.keys(lessonsData[filterClass] || {}).map((subjectName) => (
                  <Picker.Item key={subjectName} label={subjectName} value={subjectName} />
                ))}
              </Picker>
            </View>
          </Surface>
        )}

        {(() => {
          const filteredByClass = filterClass === "all"
            ? visibleLessons
            : { [filterClass]: visibleLessons[filterClass] || {} };

          return Object.keys(filteredByClass).length === 0 ? (
            <Surface style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No lesson plans assigned for {selectedDate}.</Text>
            </Surface>
          ) : (
          <ScrollView>
            {Object.keys(filteredByClass).map((className) => (
              <View key={className} style={styles.classSection}>
                <Text style={styles.classTitle}>{className}</Text>
                {Object.keys(filteredByClass[className]).map((subjectName) => (
                  <View key={subjectName} style={styles.subjectSection}>
                    <Text style={styles.subjectTitle}>{subjectName}</Text>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, styles.tableCellChapter, styles.headerCell]}>Chapter</Text>
                      <Text style={[styles.tableCell, styles.tableCellTopic, styles.headerCell]}>Topic</Text>
                      <Text style={[styles.tableCell, styles.tableCellSubtopic, styles.headerCell]}>Subtopic</Text>
                      <Text style={[styles.tableCell, styles.tableCellActivity, styles.headerCell]}>Activity</Text>
                      <Text style={[styles.tableCell, styles.tableCellPlannedDate, styles.headerCell]}>Planned Date</Text>
                      <Text style={[styles.tableCell, styles.tableCellCompletedDate, styles.headerCell]}>Completed Date</Text>
                      <Text style={[styles.tableCell, styles.tableCellUser, styles.headerCell]}>User</Text>
                      <Text style={[styles.tableCell, styles.tableCellStatus, styles.headerCell]}>Status</Text>
                    </View>
                    {filteredByClass[className][subjectName].map((item, index) => (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.tableCellChapter]}>{item.chapter_name || `Chapter ${item.chapter_no}`}</Text>
                        <Text style={[styles.tableCell, styles.tableCellTopic]}>{item.topic}</Text>
                        <Text style={[styles.tableCell, styles.tableCellSubtopic]}>{item.sub_topic}</Text>
                        <Text style={[styles.tableCell, styles.tableCellActivity]}>{item.activity || '-'}</Text>
                        <Text style={[styles.tableCell, styles.tableCellPlannedDate]}>{formatDateString(item.planned_date)}</Text>
                        <Text style={[styles.tableCell, styles.tableCellCompletedDate]}>{formatDateString(item.completed_date)}</Text>
                        <Text style={[styles.tableCell, styles.tableCellUser]}>{item.user_name}</Text>
                        <View style={[styles.tableCell, styles.tableCellStatus]}>
                          {item.status === 'completed' || item.completed_date ? (
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
          );
        })()}
      </View>
    );
  };

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
    backgroundColor: "transparent",
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: "space-between",
  },

  tabButton: {
    flex: 1,
    borderRadius: 20,
    marginHorizontal: 4,
    minHeight: 38,
    justifyContent: "center",
    backgroundColor: "#f4f5f7",
  },

  activeTabButton: {
    backgroundColor: "#2563eb",
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1f2937",
    textTransform: "none",
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  innerContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 980,
    padding: 16,
    backgroundColor: "#ffffff",
    alignSelf: "center",
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

  tabContent: {
    paddingBottom: 24,
    paddingHorizontal: 12,
    backgroundColor: "#f4f7fb",
    alignItems: "center",
  },

  filterContainer: {
    width: "100%",
    maxWidth: 940,
    alignSelf: "center",
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
  },

  summaryContainer: {
    width: "100%",
    maxWidth: 940,
    alignSelf: "center",
    marginBottom: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: 6,
  },

  summaryText: {
    fontSize: 14,
    color: "#334155",
  },

  pendingList: {
    marginTop: 12,
  },

  pendingItem: {
    fontSize: 13,
    color: "#1e293b",
    lineHeight: 20,
    marginBottom: 4,
  },

  pickerContainer: {
    width: "100%",
    maxWidth: 380,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    overflow: "hidden",
    maxWidth: 360,
    minWidth: 200,
    elevation: 2,
  },

  picker: {
    width: "100%",
    height: 44,
    color: "#000",
    borderRadius: 16,
    backgroundColor: "transparent",
    paddingHorizontal: 12,
  },

  dateInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
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
    backgroundColor: "#eef2ff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },

  tableContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
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

  tableCellPlannedDate: {
    flex: 1,
  },

  tableCellCompletedDate: {
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

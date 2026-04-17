import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Surface,
  Divider,
  Menu,
  Portal,
  Modal,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";


const WEEKDAYS = [
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
  { key: 7, label: "Sun" },
];

export default function AdminAssignTaskScreen() {
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [skipDays, setSkipDays] = useState([]);
  const [graceDays, setGraceDays] = useState("0");
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [t, u, a] = await Promise.all([
        apiFetch("/admin_get_templates.php"),
        apiFetch("/admin_get_users.php"),
        apiFetch("/admin_get_assignments.php"),
      ]);
      setTemplates(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(u) ? u : []);
      setAssignments(Array.isArray(a) ? a : []);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
  };






  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSkipDay = (dayKey) => {
    setSkipDays(prev =>
      prev.includes(dayKey)
        ? prev.filter(d => d !== dayKey)
        : [...prev, dayKey]
    );
  };

  const parseDateString = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  };

  const getCalendarMatrix = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const matrix = [];
    let row = [];

    for (let i = 0; i < offset; i += 1) {
      row.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      row.push(day);
      if (row.length === 7) {
        matrix.push(row);
        row = [];
      }
    }

    while (row.length < 7) {
      row.push(null);
    }

    if (row.some((value) => value !== null)) {
      matrix.push(row);
    }

    return matrix;
  };

  const formatMonthYear = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const openCalendar = (field) => {
    const parsed = field === 'start' ? parseDateString(startDate) : parseDateString(endDate);
    setCalendarMonth(parsed || new Date());
    setActiveCalendar(field);
  };

  const closeCalendar = () => {
    setActiveCalendar("");
  };

  const selectCalendarDay = (day) => {
    if (!day) return;
    const selected = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const formatted = `${String(selected.getDate()).padStart(2, '0')}/${String(selected.getMonth() + 1).padStart(2, '0')}/${selected.getFullYear()}`;

    if (activeCalendar === 'start') {
      setStartDate(formatted);
    } else if (activeCalendar === 'end') {
      setEndDate(formatted);
    }

    closeCalendar();
  };

  const changeCalendarMonth = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      return next;
    });
  };

  const assignTasksToUsers = async () => {
    if (!selectedTemplate) {
      Alert.alert("Error", "Please select a task template");
      return;
    }
    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Please select at least one user");
      return;
    }
    if (!startDate) {
      Alert.alert("Error", "Please select a start date");
      return;
    }

    setLoading(true);
    try {
      for (const userId of selectedUsers) {
        const data = {
          task_template_id: selectedTemplate,
          assigned_user_id: userId,
          assigned_department: "",
          start_date: formatDateTimeForBackend(startDate, startTime),
          end_date: endDate ? formatDateTimeForBackend(endDate, endTime) : "",
          grace_days: graceDays,
          skip_weekdays: skipDays.join(","),
        };

        await apiFetch("/admin_assign_task.php", {
          method: "POST",
          body: data,
        });
      }

      Alert.alert("Success", `Task assigned to ${selectedUsers.length} user(s)!`);
      
      // Reset form
      setSelectedUsers([]);
      setSelectedTemplate("");
      setStartDate("");
      setStartTime("");
      setEndDate("");
      setEndTime("");
      setSkipDays([]);
      setGraceDays("0");
      
      loadAll();
    } catch (err) {
      Alert.alert("Error", "Failed to assign task: " + err.message);
    } finally {
      setLoading(false);
    }
  };



  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(dateString)) return false;
    const [, day, month, year] = dateString.match(regex);
    const date = new Date(`${year}-${month}-${day}`);
    return date instanceof Date && !isNaN(date);
  };

  const isValidTime = (timeString) => {
    if (!timeString) return true; // time is optional
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(timeString);
  };

  // Convert DD/MM/YYYY HH:MM to YYYY-MM-DD HH:MM:SS for backend
  const formatDateTimeForBackend = (date, time) => {
    if (!date) return "";
    const [day, month, year] = date.split('/');
    const timeStr = time || "00:00";
    return `${year}-${month}-${day} ${timeStr}:00`;
  };

  // Convert YYYY-MM-DD HH:MM:SS from backend to DD/MM/YYYY HH:MM for display
  const formatDateTimeForDisplay = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const [datePart, timePart] = dateTimeStr.split(' ');
    const [year, month, day] = datePart.split('-');
    const displayDate = `${day}/${month}/${year}`;
    const displayTime = timePart ? timePart.substring(0, 5) : "";
    return { date: displayDate, time: displayTime };
  };


  const formatDateTime = (d) => {
    return d.toISOString().split('T')[0];
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* TASK ASSIGNMENT FORM */}
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="add-circle" size={24} color="#2563EB" />
            <Text style={styles.cardTitle}>Assign Task to Users</Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.cardContent}>
            {/* Select Template */}
            <Text style={styles.label}>Task Template *</Text>
            <Menu
              visible={templateMenuOpen}
              onDismiss={() => setTemplateMenuOpen(false)}
              anchor={
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setTemplateMenuOpen(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {selectedTemplate
                      ? templates.find(t => t.id == selectedTemplate)?.title || "Select Template"
                      : "Select Template"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              }
              theme={{ colors: { backdrop: 'transparent' } }}
            >
              {templates.map((template) => (
                <Menu.Item
                  key={template.id}
                  title={template.title}
                  onPress={() => {
                    setSelectedTemplate(template.id);
                    setTemplateMenuOpen(false);
                  }}
                />
              ))}
            </Menu>

            {/* Select Users */}
            <Text style={styles.label}>Select Users *</Text>
            <View style={styles.userGrid}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userCheckbox,
                    selectedUsers.includes(user.id) && styles.userCheckboxSelected
                  ]}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <Ionicons
                    name={selectedUsers.includes(user.id) ? "checkbox" : "checkbox-outline"}
                    size={20}
                    color={selectedUsers.includes(user.id) ? "#2563EB" : "#CBD5E1"}
                  />
                  <Text style={[
                    styles.userCheckboxText,
                    selectedUsers.includes(user.id) && styles.userCheckboxTextSelected
                  ]}>
                    {user.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date/Time Inputs */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeGroup}>
                <Text style={styles.label}>Start Date *</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => openCalendar('start')}
                >
                  <Ionicons name="calendar" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={styles.datePickerText}>{startDate || "Select Date"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeGroup}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  placeholder="HH:MM"
                  value={startTime}
                  onChangeText={setStartTime}
                  mode="outlined"
                  left={<TextInput.Icon icon="time" />}
                  style={styles.miniInput}
                />
              </View>

              <View style={styles.dateTimeGroup}>
                <Text style={styles.label}>End Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => openCalendar('end')}
                >
                  <Ionicons name="calendar" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={styles.datePickerText}>{endDate || "Select Date"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeGroup}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  placeholder="HH:MM"
                  value={endTime}
                  onChangeText={setEndTime}
                  mode="outlined"
                  left={<TextInput.Icon icon="time" />}
                  style={styles.miniInput}
                />
              </View>
            </View>

            <Portal>
              <Modal
                visible={activeCalendar !== ""}
                onDismiss={closeCalendar}
                contentContainerStyle={styles.calendarModal}
              >
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
                    <Ionicons name="chevron-back" size={24} color="#111" />
                  </TouchableOpacity>
                  <Text style={styles.calendarTitle}>{formatMonthYear(calendarMonth)}</Text>
                  <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
                    <Ionicons name="chevron-forward" size={24} color="#111" />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label) => (
                    <Text key={label} style={styles.calendarWeekLabel}>{label}</Text>
                  ))}
                </View>
                {getCalendarMatrix(calendarMonth).map((week, rowIndex) => (
                  <View key={rowIndex} style={styles.calendarWeekRow}>
                    {week.map((day, dayIndex) => (
                      <TouchableOpacity
                        key={dayIndex}
                        style={[
                          styles.calendarDay,
                          day && styles.calendarDayButton,
                          day && `${String(day).padStart(2, '0')}/${String(calendarMonth.getMonth() + 1).padStart(2, '0')}/${calendarMonth.getFullYear()}` === (activeCalendar === 'start' ? startDate : endDate) && styles.calendarDaySelected,
                        ]}
                        disabled={!day}
                        onPress={() => selectCalendarDay(day)}
                      >
                        <Text style={[styles.calendarDayText, day && styles.calendarDayTextActive]}>
                          {day || ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </Modal>
            </Portal>

            {/* Skip Days */}
            <Text style={styles.label}>Skip Days (Optional)</Text>
            <View style={styles.weekdaysGrid}>
              {WEEKDAYS.map((day) => (
                <TouchableOpacity
                  key={day.key}
                  style={[styles.dayCheckbox, skipDays.includes(day.key) && styles.dayCheckboxSelected]}
                  onPress={() => toggleSkipDay(day.key)}
                >
                  <Ionicons
                    name={skipDays.includes(day.key) ? "checkbox" : "checkbox-outline"}
                    size={16}
                    color={skipDays.includes(day.key) ? "#2563EB" : "#CBD5E1"}
                  />
                  <Text style={styles.dayLabel}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grace Days */}
            <Text style={styles.label}>Grace Days</Text>
            <TextInput
              placeholder="0"
              value={graceDays}
              onChangeText={setGraceDays}
              mode="outlined"
              keyboardType="numeric"
              style={styles.miniInput}
            />

            {/* Assign Button */}
            <Button
              mode="contained"
              onPress={assignTasksToUsers}
              loading={loading}
              disabled={loading || selectedUsers.length === 0 || !selectedTemplate}
              style={{ maxWidth: ADMIN_BUTTON_MAX_WIDTH, marginTop: 16 }}
            >
              Assign Task
            </Button>
          </View>
        </Surface>

        {/* ASSIGNMENTS TABLE */}
        <Surface style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={24} color="#2563EB" />
            <Text style={styles.cardTitle}>Active Assignments ({assignments.length})</Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.tableWrapper}>
            {assignments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No assignments yet</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.col1]}>User</Text>
                    <Text style={[styles.tableHeaderCell, styles.col2]}>Task</Text>
                    <Text style={[styles.tableHeaderCell, styles.col3]}>Start Date</Text>
                    <Text style={[styles.tableHeaderCell, styles.col4]}>End Date</Text>
                    <Text style={[styles.tableHeaderCell, styles.col5]}>Skip Days</Text>
                  </View>

                  {assignments.map((assignment) => (
                    <View key={assignment.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.col1]}>{assignment.user_name || "N/A"}</Text>
                      <Text style={[styles.tableCell, styles.col2]}>{assignment.task_title}</Text>
                      <Text style={[styles.tableCell, styles.col3]}>{assignment.start_date}</Text>
                      <Text style={[styles.tableCell, styles.col4]}>{assignment.end_date || "Ongoing"}</Text>
                      <Text style={[styles.tableCell, styles.col5]}>{assignment.skip_weekdays || "None"}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  cardContent: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    marginTop: 12,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  selectButtonText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  userGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  userCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  userCheckboxSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  userCheckboxText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  userCheckboxTextSelected: {
    color: "#2563EB",
    fontWeight: "600",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  dateTimeGroup: {
    flex: 1,
    minWidth: 140,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  datePickerText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  miniInput: {
    height: 40,
    fontSize: 12,
    backgroundColor: "#FFFFFF",
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    maxWidth: 420,
    alignSelf: "center",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarWeekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  calendarDayButton: {
    backgroundColor: "#F8FAFC",
  },
  calendarDaySelected: {
    backgroundColor: "#2563EB",
  },
  calendarDayText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  calendarDayTextActive: {
    color: "#0F172A",
  },
  weekdaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  dayCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dayCheckboxSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  dayLabel: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "500",
  },
  tableWrapper: {
    padding: 0,
  },
  tableContainer: {
    minWidth: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 2,
    borderBottomColor: "#CBD5E1",
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
    color: "#1E293B",
  },
  col1: { width: 120, minWidth: 120 },
  col2: { width: 150, minWidth: 150 },
  col3: { width: 130, minWidth: 130 },
  col4: { width: 130, minWidth: 130 },
  col5: { width: 100, minWidth: 100 },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
    fontStyle: "italic",
    fontSize: 13,
    fontWeight: "500",
  },
});

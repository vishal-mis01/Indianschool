import React, { useState, useEffect } from "react";
import { ScrollView, View, StyleSheet, FlatList, useWindowDimensions } from "react-native";
import { Text, TextInput, Button, Surface, Menu } from "react-native-paper";
import apiFetch from "./apiFetch";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "regular_absent", label: "Regular Absent" },
  { value: "on_leave", label: "On Leave" },
  { value: "long_leave", label: "Long Leave" },
  { value: "refused", label: "Refused" },
];

const formatToday = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function UserAttendanceForm({ onBack }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classMenuVisible, setClassMenuVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [openStudentMenuFor, setOpenStudentMenuFor] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(formatToday());
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadUserClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents(selectedClass.id);
    } else {
      setStudents([]);
      setStudentStatuses({});
    }
  }, [selectedClass]);

  const loadUserClasses = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await apiFetch("/classes/list_user_classes.php", { method: "GET" });
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || "Unable to load your assigned classes.");
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudents = async (classId) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await apiFetch(`/classes/list_class_students.php?class_id=${classId}`, {
        method: "GET",
      });
      const studentList = Array.isArray(data) ? data : [];
      setStudents(studentList);
      const initialStatuses = {};
      studentList.forEach((student) => {
        initialStatuses[student.id] = "present";
      });
      setStudentStatuses(initialStatuses);
    } catch (err) {
      setErrorMessage(err.message || "Unable to load students for this class.");
      setStudents([]);
      setStudentStatuses({});
    } finally {
      setLoading(false);
    }
  };

  const setStatusForStudent = (studentId, status) => {
    setStudentStatuses((current) => ({ ...current, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedClass) {
      alert("Please select a class first.");
      return;
    }
    if (!attendanceDate) {
      alert("Please enter the attendance date.");
      return;
    }
    if (students.length === 0) {
      alert("No students found for this class.");
      return;
    }

    const payload = {
      class_id: selectedClass.id,
      attendance_date: attendanceDate,
      remarks,
      students: students.map((student) => ({
        student_id: student.id,
        status: studentStatuses[student.id] || "present",
      })),
    };

    setLoading(true);
    setErrorMessage("");
    try {
      await apiFetch("/forms/submit_attendance.php", {
        method: "POST",
        body: payload,
      });
      setSuccessMessage("Attendance recorded successfully.");
      setRemarks("");
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit attendance.");
    } finally {
      setLoading(false);
    }
  };

  const renderStudentRow = ({ item: student }) => {
    const currentStatus = studentStatuses[student.id] || "present";
    const selectedStatus = STATUS_OPTIONS.find((option) => option.value === currentStatus)?.label || "Present";

    return (
      <View style={styles.studentRow} key={student.id}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name || student.email || `Student ${student.id}`}</Text>
          {student.email ? <Text style={styles.studentEmail}>{student.email}</Text> : null}
        </View>

        <Menu
          visible={openStudentMenuFor === student.id}
          onDismiss={() => setOpenStudentMenuFor(null)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setOpenStudentMenuFor(student.id)}
              style={styles.statusMenuButton}
              contentStyle={styles.statusButtonContent}
            >
              {selectedStatus}
            </Button>
          }
        >
          {STATUS_OPTIONS.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setStatusForStudent(student.id, option.value);
                setOpenStudentMenuFor(null);
              }}
              title={option.label}
            />
          ))}
        </Menu>
      </View>
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={width >= 768 ? styles.pageWebContent : styles.pageContent}>
      <View style={[styles.formWrapper, width >= 768 && styles.formWrapperWeb]}>
        <Surface style={styles.formCard} elevation={0}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Attendance</Text>
            <Text style={styles.subheader}>Complete all required fields</Text>
          </View>

          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Class</Text>
            <Menu
              visible={classMenuVisible}
              onDismiss={() => setClassMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setClassMenuVisible(true)}
                  style={styles.dropdownButton}
                  contentStyle={styles.dropdownButtonContent}
                  icon="chevron-down"
                >
                  {selectedClass ? selectedClass.name : "Select class"}
                </Button>
              }
            >
              {classes.map((cls) => (
                <Menu.Item
                  key={cls.id}
                  onPress={() => {
                    setSelectedClass(cls);
                    setClassMenuVisible(false);
                  }}
                  title={`${cls.name}${cls.section ? ` (${cls.section})` : ""}`}
                />
              ))}
            </Menu>
          </Surface>

          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              mode="flat"
              value={attendanceDate}
              onChangeText={setAttendanceDate}
              placeholder="DD/MM/YYYY"
              style={styles.input}
              underlineColor="#CBD5E1"
              activeUnderlineColor="#2563EB"
              left={<TextInput.Icon icon="calendar" />}
            />
          </Surface>

          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Students</Text>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            {selectedClass ? (
              students.length === 0 ? (
                <Text style={styles.emptyText}>No students assigned to this class yet.</Text>
              ) : (
                <FlatList
                  data={students}
                  renderItem={renderStudentRow}
                  keyExtractor={(student) => String(student.id)}
                  scrollEnabled={false}
                />
              )
            ) : (
              <Text style={styles.emptyText}>Please choose your class first.</Text>
            )}
          </Surface>

          <Surface style={styles.fieldCard}>
            <Text style={styles.label}>Remarks (optional)</Text>
            <TextInput
              mode="flat"
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add a general note"
              style={[styles.input, styles.remarkInput]}
              multiline
              numberOfLines={3}
              underlineColor="#CBD5E1"
              activeUnderlineColor="#2563EB"
            />
          </Surface>

          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <View style={styles.buttonContainer}>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={submitAttendance}
                loading={loading}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonLabel}
                icon="check-circle"
              >
                Submit
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setSelectedClass(null);
                  setAttendanceDate(formatToday());
                  setRemarks("");
                  setSuccessMessage("");
                  setErrorMessage("");
                }}
                style={styles.clearButton}
                contentStyle={styles.clearButtonContent}
                labelStyle={styles.clearButtonLabel}
                icon="restart"
              >
                Clear
              </Button>
            </View>
            <Button mode="text" onPress={onBack} style={styles.backButton} icon="arrow-left">
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
  pageContent: {
    paddingBottom: 140,
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
  remarkInput: {
    minHeight: 90,
  },
  dropdownButton: {
    justifyContent: "space-between",
  },
  dropdownButtonContent: {
    justifyContent: "space-between",
  },
  studentRow: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentInfo: {
    marginBottom: 0,
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentEmail: {
    fontSize: 13,
    color: "#475569",
  },
  statusMenuButton: {
    alignSelf: "flex-start",
  },
  statusButtonContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    maxWidth: 80,
    paddingHorizontal: 8,
  },
  submitButtonContent: {
    paddingVertical: 0,
    height: 24,
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
  submitButtonLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearButtonLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#2563EB",
  },
  success: {
    color: "#16A34A",
    marginTop: 8,
    marginBottom: 8,
    fontWeight: "600",
    textAlign: "center",
  },
  error: {
    color: "#B91C1C",
    marginBottom: 12,
  },
  emptyText: {
    color: "#475569",
    marginBottom: 16,
  },
});
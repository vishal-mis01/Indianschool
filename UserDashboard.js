import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Surface, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import UserAllTasks from "./UserAllTasks";
import UserFormFill from "./UserFormFill";
import UserAttendanceForm from "./UserAttendanceForm";
import UserReports from "./UserReports";
import UserLessonPlans from "./UserLessonPlans";
import apiFetch from "./apiFetch";

export default function UserDashboard({ user, onLogout }) {
  const [active, setActive] = useState("tasks");
  const [assignedForms, setAssignedForms] = useState([]);
  const [formId, setFormId] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["auth_token", "role", "user_id", "cached_reports", "remembered_email"]);
      onLogout?.();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  useEffect(() => {
    if (active !== "forms") {
      setFormId(null);
      setAttendanceMode(false);
      return;
    }

    setError("");
    apiFetch("/forms/user_assigned_forms.php")
      .then((res) => {
        setAssignedForms(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        setAssignedForms([]);
        setError(err.message || "Failed to load forms.");
      });
  }, [active]);

  function renderContent() {
    switch (active) {
      case "tasks":
        return <UserAllTasks user={user} />;
      case "lessonplans":
        return <UserLessonPlans />;
      case "forms":
        if (attendanceMode) {
          return <UserAttendanceForm onBack={() => setAttendanceMode(false)} />;
        }

        if (formId) {
          return <UserFormFill formId={formId} onBack={() => setFormId(null)} />;
        }

        return (
          <View style={styles.content}>
            <Text style={styles.title}>Assigned Forms</Text>
            {error ? <Text style={{ color: "#EF4444" }}>{error}</Text> : null}
            <ScrollView style={styles.grid} horizontal={true} showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                key="attendance-card"
                style={styles.cardWrapper}
                onPress={() => setAttendanceMode(true)}
              >
                <View style={[styles.formCard, styles.attendanceCard]}>
                  <Text style={styles.formName}>Mark Attendance</Text>
                  <Text style={styles.cardHint}>Tap to mark attendance</Text>
                </View>
              </TouchableOpacity>
              {assignedForms.map((form) => (
                <TouchableOpacity key={form.assignment_id} style={styles.cardWrapper} onPress={() => setFormId(form.form_id)}>
                  <View style={styles.formCard}>
                    <Text style={styles.formName}>{form.form_name}</Text>
                    <Text style={styles.cardHint}>Tap to fill</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {assignedForms.length === 0 ? (
              <Text style={styles.emptyText}>No other forms assigned</Text>
            ) : null}
          </View>
        );
      case "reports":
        return <UserReports user={user} />;
      default:
        return <View style={styles.content} />;
    }
  }

  return (
    <View style={styles.outerWrapper}>
      <View style={[styles.container, !isMobile && styles.containerWeb]}>
        {renderContent()}
          <View
            style={[
              styles.tabBarBottom,
              {
                // Position tab bar flush to the bottom; keep content above system buttons via padding
                bottom: 0,
                paddingBottom: insets.bottom,
              },
            ]}
          >
          <TouchableOpacity
            style={[styles.tab, active === "tasks" && styles.activeTab]}
            onPress={() => setActive("tasks")}
          >
            <Ionicons
              name="list"
              size={20}
              color={active === "tasks" ? "#2563EB" : "#64748B"}
            />
            <Text style={[styles.tabText, active === "tasks" && styles.activeTabText]}>
              Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, active === "lessonplans" && styles.activeTab]}
            onPress={() => setActive("lessonplans")}
          >
            <Ionicons
              name="book"
              size={20}
              color={active === "lessonplans" ? "#2563EB" : "#64748B"}
            />
            <Text style={[styles.tabText, active === "lessonplans" && styles.activeTabText]}>
              Lesson Plans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, active === "forms" && styles.activeTab]}
            onPress={() => setActive("forms")}
          >
            <Ionicons
              name="document"
              size={20}
              color={active === "forms" ? "#2563EB" : "#64748B"}
            />
            <Text style={[styles.tabText, active === "forms" && styles.activeTabText]}>
              Forms
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, active === "reports" && styles.activeTab]}
            onPress={() => setActive("reports")}
          >
            <Ionicons
              name="bar-chart"
              size={20}
              color={active === "reports" ? "#2563EB" : "#64748B"}
            />
            <Text style={[styles.tabText, active === "reports" && styles.activeTabText]}>
              Reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutTab}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutTabText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    width: '100%',
    paddingTop: 30,
  },
  container: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  containerWeb: {
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    display: "none",
  },
  headerContent: {
    display: "none",
  },
  headerTitle: {
    display: "none",
  },
  headerSubtitle: {
    display: "none",
  },
  logoutBtn: {
    flexDirection: "row",
    marginLeft: "auto",
    marginRight: 12,
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    gap: 6,
    height: 40,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tabBar: {
    display: "none",
  },
  logoutBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  tabBarBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFF",
    paddingBottom: 0,
    paddingTop: 4,
    zIndex: 9999,
    elevation: 9999,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: "#EBF2FF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  activeTabText: {
    color: "#2563EB",
  },
  logoutTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
    marginHorizontal: 4,
  },
  logoutTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#EF4444",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // keep content above bottom tabs/nav bar without excess gap
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  attendanceButton: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  cardWrapper: {
    marginBottom: 0,
    width: 200,
  },
  formCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  attendanceCard: {
    borderLeftColor: "#7C3AED",
    backgroundColor: "#F8F0FC",
  },
  formName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
});

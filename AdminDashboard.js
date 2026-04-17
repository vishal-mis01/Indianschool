import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  Text,
  Button,
  Avatar,
  Surface,
  Menu,
} from "react-native-paper";

import AdminCreateTaskScreen from "./AdminCreateTaskScreen";
import AdminAssignTaskScreen from "./AdminAssignTaskScreen";
import AdminHolidayScreen from "./AdminHolidayScreen";
import AdminReportsScreen from "./AdminReportsScreen";

import AdminFmsBuilder from "./AdminFmsBuilder";
import AdminFmsView from "./AdminFmsView";

import AdminFormBuilder from "./AdminFormBuilder";
import FormResponsesViewer from "./FormResponsesViewer";
import CreateUserScreen from "./CreateUserScreen";
import SelectFormScreen from "./SelectFormScreen";
import AdminClassesScreen from "./AdminClassesScreen";
import AdminSubjectsScreen from "./AdminSubjectsScreen";
import AdminUserAccessScreen from "./AdminUserAccessScreen";
import AdminSyllabusUploadScreen from "./AdminSyllabusUploadScreen";

export default function AdminDashboard({ onLogout }) {
  const [active, setActive] = useState("tasks");
  const [selectedFormId, setSelectedFormId] = useState(null);

  // on web, react-native-paper inserts a backdrop div that captures clicks.
  // inject global CSS to make it transparently non‑interactive.
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        .react-native-paper__backdrop {
          pointer-events: none !important;
          background-color: transparent !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const renderContent = () => {
    switch (active) {
      case "assign":
        return <AdminAssignTaskScreen />;
      case "holidays":
        return <AdminHolidayScreen />;
      case "reports":
        return <AdminReportsScreen />;
      case "fms_view":
        return <AdminFmsView />;
      case "fms_builder":
        return <AdminFmsBuilder />;
      case "forms":
        return <AdminFormBuilder />;
      case "classes":
        return <AdminClassesScreen />;
      case "subjects":
        return <AdminSubjectsScreen />;
      case "user_access":
        return <AdminUserAccessScreen />;
      case "syllabus_upload":
        return <AdminSyllabusUploadScreen />;
      case "create_user":
        return <CreateUserScreen user={{ user_id: 1, role: 'admin' }} />;
      case "form_responses":
        return selectedFormId ? (
          <FormResponsesViewer formId={selectedFormId} onBack={() => setSelectedFormId(null)} />
        ) : (
          <SelectFormScreen onSelect={setSelectedFormId} />
        );
      case "tasks":
      default:
        return <AdminCreateTaskScreen />;
    }
  };

  const getHeaderTitle = () => {
    switch (active) {
      case "assign":
        return "Assignment Rules";
      case "holidays":
        return "Holidays";
      case "reports":
        return "User Reports";
      case "fms_view":
        return "FMS Overview";
      case "fms_builder":
        return "FMS Process Builder";
      case "forms":
        return "Form Builder";
      case "classes":
        return "Classes";
      case "subjects":
        return "Subjects";
      case "user_access":
        return "User Access Control";
      case "syllabus_upload":
        return "Syllabus Upload";
      default:
        return "Tasks";
    }
  };

  const navItems = [
    { key: "tasks", title: "Tasks" },
    { key: "form_responses", title: "Form Responses" },
    { key: "assign", title: "Assignment Rules" },
    { key: "fms_view", title: "FMS Overview" },
    { key: "fms_builder", title: "FMS Builder" },
    { key: "forms", title: "Forms" },
    { key: "classes", title: "Classes" },
    { key: "subjects", title: "Subjects" },
    { key: "user_access", title: "User Access" },
    { key: "syllabus_upload", title: "Syllabus Upload" },
    { key: "holidays", title: "Holidays" },
    { key: "reports", title: "Reports" },
    { key: "create_user", title: "Create User" },
  ];

  return (
    <View style={styles.container}>
      {/* SIDEBAR */}
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <Text style={styles.brandText}>Admin Panel</Text>
        </View>
        <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={true}>
          {navItems.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.sidebarItem,
                active === item.key && styles.sidebarItemActive
              ]}
              onPress={() => setActive(item.key)}
            >
              <Text style={[
                styles.sidebarItemText,
                active === item.key && styles.sidebarItemTextActive
              ]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* MAIN CONTENT AREA */}
      <View style={styles.main}>
        {/* HEADER */}
        <Surface style={styles.header} elevation={2}>
          <Text variant="headlineSmall">{getHeaderTitle()}</Text>
          <View style={styles.profile}>
            <Text>Admin</Text>
            <Avatar.Text size={36} label="A" />
            <Button mode="contained-tonal" onPress={onLogout}>Logout</Button>
          </View>
        </Surface>

        {/* CONTENT */}
        <ScrollView
          style={styles.contentScroll}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
        >
          <View style={styles.content}>{renderContent()}</View>
        </ScrollView>
      </View>
    </View>
  );
}
function SidebarItem({ icon, label, active, onPress, showLabel }) {
  return (
    <Button
      icon={icon}
      mode={active ? "contained" : "text"}
      onPress={onPress}
      style={styles.sidebarBtn}
      contentStyle={{
        justifyContent: showLabel ? "flex-start" : "center",
      }}
      textColor={active ? "#fff" : "#c7d2fe"}
      buttonColor={active ? "#2563eb" : "transparent"}
    >
      {showLabel ? label : ""}
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F8FAFC',
    height: '100vh',
  },
  sidebar: {
    width: 280,
    backgroundColor: "#1E293B",
    borderRightWidth: 1,
    borderRightColor: "#0F172A",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  sidebarScroll: {
    flex: 1,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  brandText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  sidebarItemActive: {
    backgroundColor: "#2563eb",
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#c7d2fe",
  },
  sidebarItemTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  sidebarBtn: {
    marginVertical: 4,
    borderRadius: 10,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  contentScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    backgroundColor: 'transparent',
  },
});

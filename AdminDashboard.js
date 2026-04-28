import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
} from "react-native";
import {
  Text,
  Button,
  Avatar,
  Surface,
} from "react-native-paper";

// Screens
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
  const [collapsed, setCollapsed] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(null);

  const toggleSidebar = () => {
    LayoutAnimation.easeInEaseOut();
    setCollapsed(!collapsed);
  };

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
        return <CreateUserScreen user={{ user_id: 1, role: "admin" }} />;
      case "form_responses":
        return selectedFormId ? (
          <FormResponsesViewer
            formId={selectedFormId}
            onBack={() => setSelectedFormId(null)}
          />
        ) : (
          <SelectFormScreen onSelect={setSelectedFormId} />
        );
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
    { key: "tasks", title: "Tasks", icon: "clipboard-text" },
    { key: "form_responses", title: "Forms", icon: "file-document" },
    { key: "assign", title: "Assign", icon: "account-check" },
    { key: "fms_view", title: "FMS", icon: "view-dashboard" },
    { key: "fms_builder", title: "Builder", icon: "tools" },
    { key: "forms", title: "Forms", icon: "form-select" },
    { key: "classes", title: "Classes", icon: "school" },
    { key: "subjects", title: "Subjects", icon: "book" },
    { key: "user_access", title: "Access", icon: "shield-account" },
    { key: "syllabus_upload", title: "Syllabus", icon: "upload" },
    { key: "holidays", title: "Holidays", icon: "calendar" },
    { key: "reports", title: "Reports", icon: "chart-bar" },
    { key: "create_user", title: "Create User", icon: "account-plus" },
  ];

  return (
    <View style={styles.container}>
      {/* SIDEBAR */}
      <View
        style={[
          styles.sidebar,
          collapsed && styles.sidebarCollapsed,
        ]}
      >
        {/* BRAND + TOGGLE */}
<View style={styles.brand}>
  {!collapsed && (
    <Text style={styles.brandText}>Admin Panel</Text>
  )}

  <View style={styles.toggleBtnWrapper}>
    <Button
      icon={collapsed ? "menu" : "chevron-left"}
      onPress={toggleSidebar}
      compact
      textColor="#fff"
    />
  </View>
</View>

        {/* MENU */}
        <ScrollView showsVerticalScrollIndicator>
          {navItems.map((item) => (
            <Button
              key={item.key}
              icon={item.icon}
              mode={active === item.key ? "contained" : "text"}
              onPress={() => setActive(item.key)}
              style={styles.sidebarBtn}
              contentStyle={{
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              textColor={active === item.key ? "#ffffff" : "#c7d2fe"}
              buttonColor={
                active === item.key ? "#2563eb" : "transparent"
              }
            >
              {!collapsed && item.title}
            </Button>
          ))}
        </ScrollView>
      </View>

      {/* MAIN */}
      <View style={styles.main}>
        {/* HEADER */}
        <Surface style={styles.header} elevation={2}>
          <Text variant="headlineSmall">{getHeaderTitle()}</Text>

          <View style={styles.profile}>
            <Text>Admin</Text>
            <Avatar.Text size={36} label="A" />
            <Button mode="contained-tonal" onPress={onLogout}>
              Logout
            </Button>
          </View>
        </Surface>

        {/* CONTENT */}
        <ScrollView style={styles.contentScroll}>
          <View style={styles.content}>{renderContent()}</View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    height: "100vh",
  },

  sidebar: {
    width: 260,
    backgroundColor: "#1e293b",
    padding: 12,
  },

  sidebarCollapsed: {
    width: 80,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  brandText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  sidebarBtn: {
    marginVertical: 4,
    borderRadius: 10,
  },

  main: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  contentScroll: {
    flex: 1,
  },

  content: {
    padding: 20,
  },
});
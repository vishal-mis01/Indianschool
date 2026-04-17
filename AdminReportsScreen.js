import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from "react-native";
import { Text, Surface, Divider, ActivityIndicator, Avatar, Button, DataTable } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import apiFetch from "./apiFetch";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";

export default function AdminReportsScreen() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { width } = useWindowDimensions();

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Load report when user is selected
  useEffect(() => {
    if (selectedUserId) {
      loadReport();
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await apiFetch("/admin_get_users.php");
      const userList = Array.isArray(data) ? data : (data && data.users ? data.users : []);
      setUsers(userList);
      if (userList.length > 0) {
        setSelectedUserId(userList[0].id);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadReport = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/get_user_report.php?user_id=${selectedUserId}`);
      if (data && data.weekly_reports) {
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const getCompletionColor = (percent) => {
    if (percent >= 80) return "#10B981";
    if (percent >= 60) return "#F59E0B";
    if (percent >= 40) return "#EF4444";
    return "#DC2626";
  };

  const getShortfallColor = (shortfallPercent) => {
    // shortfallPercent is negative, so -10% (good) vs -80% (bad)
    const absShortfall = Math.abs(shortfallPercent);
    if (absShortfall <= 20) return "#10B981"; // Good performance (low shortfall)
    if (absShortfall <= 40) return "#F59E0B"; // Fair performance
    if (absShortfall <= 60) return "#EF4444"; // Poor performance
    return "#DC2626"; // Very poor performance
  };

  const lastWeek = reportData && reportData.weekly_reports && reportData.weekly_reports.length > 1
    ? reportData.weekly_reports[reportData.weekly_reports.length - 2] 
    : null;
  const currentWeek = reportData && reportData.weekly_reports && reportData.weekly_reports.length 
    ? reportData.weekly_reports[reportData.weekly_reports.length - 1] 
    : null;

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>User Reports</Text>
        <Text style={styles.subtitle}>View individual user performance</Text>
      </View>

      {loadingUsers ? (
        <Surface style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </Surface>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.content}>
            {/* User Selector */}
            <Surface style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Select User</Text>
              </View>
              <Divider />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedUserId}
                  onValueChange={(itemValue) => setSelectedUserId(itemValue)}
                  style={styles.picker}
                >
                  {users.map((user) => (
                    <Picker.Item key={user.id} label={user.name} value={user.id} />
                  ))}
                </Picker>
              </View>
            </Surface>

            {/* User Info Card */}
            {selectedUser && (
              <Surface style={styles.card}>
                <View style={styles.userInfoHeader}>
                  <Avatar.Text 
                    size={50} 
                    label={selectedUser.name.charAt(0).toUpperCase()} 
                    style={styles.avatar} 
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.userName}>{selectedUser.name}</Text>
                    <Text style={styles.userEmail}>{selectedUser.email || "No email"}</Text>
                  </View>
                </View>
              </Surface>
            )}

            {/* Report Data */}
            {loading ? (
              <Surface style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
              </Surface>
            ) : lastWeek ? (
              <Surface style={styles.card}>
                <View style={[styles.cardHeader, { paddingHorizontal: 12, paddingVertical: 10 }]}>
                  <Ionicons name="bar-chart" size={20} color="#2563EB" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.cardTitle}>Weekly Report</Text>
                    <Text style={styles.cardSubtitle}>{lastWeek.week_label}</Text>
                  </View>
                </View>
                <Divider />
                <View style={styles.reportContainer}>
                  <View style={styles.mobileCard}>
                    <Text style={styles.mobileCardTitle}>Checklist</Text>
                    <View style={styles.mobileCardRow}>
                      <View style={styles.mobileCardCol}>
                        <Text style={styles.mobileCardLabel}>Total Tasks</Text>
                        <Text style={styles.mobileCardValue}>{lastWeek.planned ?? 0}</Text>
                      </View>
                      <View style={styles.mobileCardCol}>
                        <Text style={styles.mobileCardLabel}>Completed in -</Text>
                        <Text style={styles.mobileCardValue}>
                          {lastWeek.planned > 0 ? Math.round(100 - (lastWeek.actual / lastWeek.planned) * 100) : 0}%
                        </Text>
                      </View>
                      <View style={styles.mobileCardCol}>
                        <Text style={styles.mobileCardLabel}>On-time in -</Text>
                        <Text style={styles.mobileCardValue}>
                          {lastWeek.actual > 0 ? Math.round(100 - (lastWeek.on_time / lastWeek.actual) * 100) : 0}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.mobileCard}>
                    <Text style={styles.mobileCardTitle}>FMS</Text>
                    <View style={styles.mobileCardRow}>
                      <View style={styles.mobileCardCol}>
                        <Text style={styles.mobileCardLabel}>Total Tasks</Text>
                        <Text style={styles.mobileCardValue}>{lastWeek.fms_planned ?? 0}</Text>
                      </View>
                      <View style={styles.mobileCardCol}>
                        <Text style={styles.mobileCardLabel}>Completed in -</Text>
                        <Text style={styles.mobileCardValue}>
                          {lastWeek.fms_planned > 0 ? Math.round(100 - (lastWeek.fms_completed / lastWeek.fms_planned) * 100) : 0}%
                        </Text>
                      </View>
                      <View style={styles.mobileCardCol}>
                        <Text style={styles.mobileCardLabel}>On-time in -</Text>
                        <Text style={styles.mobileCardValue}>
                          {lastWeek.fms_completed > 0 ? Math.round(100 - (lastWeek.fms_on_time / lastWeek.fms_completed) * 100) : 0}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Surface>
            ) : (
              <Surface style={styles.card}>
                <View style={styles.emptyState}>
                  <Ionicons name="information" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No report data available</Text>
                </View>
              </Surface>
            )}

            {/* Week-over-Week Comparison Table */}
            {currentWeek && lastWeek && (
              <Surface style={[styles.card, { padding: 0 }]}>
                <View style={[styles.cardHeader, { paddingHorizontal: 12, paddingVertical: 10 }]}>
                  <Ionicons name="analytics" size={20} color="#2563EB" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.cardTitle}>Week-over-Week Comparison</Text>
                    <Text style={styles.cardSubtitle}>Last week vs current week</Text>
                  </View>
                </View>
                <Divider />
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Category</DataTable.Title>
                    <DataTable.Title numeric style={{ color: '#ff0000' }}>Last Week Actual %</DataTable.Title>
                    <DataTable.Title numeric style={{ color: '#000000' }}>Current Week Actual</DataTable.Title>
                    <DataTable.Title numeric style={{ color: '#000000' }}>Current Week Actual %</DataTable.Title>
                  </DataTable.Header>
                  <DataTable.Row>
                    <DataTable.Cell>Checklist Completion</DataTable.Cell>
                    <DataTable.Cell numeric>-{lastWeek.planned > 0 ? Math.round(100 - (lastWeek.actual / lastWeek.planned) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.planned > 0 ? Math.round(100 - (currentWeek.actual / currentWeek.planned) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.planned > 0 ? Math.round(100 - (currentWeek.actual / currentWeek.planned) * 100) : 0}%</DataTable.Cell>
                  </DataTable.Row>
                  <DataTable.Row>
                    <DataTable.Cell>Checklist On-Time</DataTable.Cell>
                    <DataTable.Cell numeric>-{lastWeek.actual > 0 ? Math.round(100 - (lastWeek.on_time / lastWeek.actual) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.actual > 0 ? Math.round(100 - (currentWeek.on_time / currentWeek.actual) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.actual > 0 ? Math.round(100 - (currentWeek.on_time / currentWeek.actual) * 100) : 0}%</DataTable.Cell>
                  </DataTable.Row>
                  <DataTable.Row>
                    <DataTable.Cell>FMS Completion</DataTable.Cell>
                    <DataTable.Cell numeric>-{lastWeek.fms_planned > 0 ? Math.round(100 - (lastWeek.fms_completed / lastWeek.fms_planned) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.fms_planned > 0 ? Math.round(100 - (currentWeek.fms_completed / currentWeek.fms_planned) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.fms_planned > 0 ? Math.round(100 - (currentWeek.fms_completed / currentWeek.fms_planned) * 100) : 0}%</DataTable.Cell>
                  </DataTable.Row>
                  <DataTable.Row>
                    <DataTable.Cell>FMS On-Time</DataTable.Cell>
                    <DataTable.Cell numeric>-{lastWeek.fms_completed > 0 ? Math.round(100 - (lastWeek.fms_on_time / lastWeek.fms_completed) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.fms_completed > 0 ? Math.round(100 - (currentWeek.fms_on_time / currentWeek.fms_completed) * 100) : 0}%</DataTable.Cell>
                    <DataTable.Cell numeric>-{currentWeek.fms_completed > 0 ? Math.round(100 - (currentWeek.fms_on_time / currentWeek.fms_completed) * 100) : 0}%</DataTable.Cell>
                  </DataTable.Row>
                </DataTable>
              </Surface>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: "#2563EB",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 0,
    gap: 14,
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    borderWidth: 0,
    borderColor: "transparent",
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "left",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  pickerContainer: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    width: "10%",
    minWidth: 100,
  },
  picker: {
    height: 50,
    color: "#0F172A",
    width: "100%",
  },
  userInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  avatar: {
    backgroundColor: "#1E3A8A",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  userEmail: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  reportContainer: {
    padding: 12,
  },
  mobileCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mobileCardTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 12,
  },
  mobileCardRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  mobileCardCol: {
    flex: 1,
    minWidth: 70,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mobileCardLabel: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 3,
    fontWeight: "500",
  },
  mobileCardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#1E293B",
    marginTop: 12,
  },
});

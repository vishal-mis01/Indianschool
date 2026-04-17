import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from "react-native";
import { Text, Surface, Divider, ActivityIndicator, Avatar, DataTable } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function UserReports() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [user, setUser] = useState(null);
  const { width } = useWindowDimensions();
  const isWeeklyReportsArray = Array.isArray(weeklyReports);
  const currentWeek = isWeeklyReportsArray && weeklyReports.length > 0 ? weeklyReports[weeklyReports.length - 1] : null;
  const lastWeek = isWeeklyReportsArray && weeklyReports.length > 1 ? weeklyReports[weeklyReports.length - 2] : null;

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // First try to load from cache
      const cachedReports = await AsyncStorage.getItem("cached_reports");
      if (cachedReports) {
        try {
          const data = JSON.parse(cachedReports);
          console.log("Using cached reports:", data);
          setWeeklyReports(Array.isArray(data.weekly_reports) ? data.weekly_reports : []);
          setUser(data.user || null);
          setLoading(false);
        } catch (e) {
          console.warn("Failed to parse cached reports:", e);
        }
      }

      // Then fetch fresh data in background
      const userId = await AsyncStorage.getItem("user_id");
      
      if (!userId) {
        console.error("No user ID found");
        if (!cachedReports) {
          setWeeklyReports([]);
        }
        setLoading(false);
        return;
      }

      console.log("Fetching fresh reports for user:", userId);
      const data = await apiFetch(`/get_user_report.php?user_id=${userId}`);
      
      console.log("Report data received:", data);
      
      if (data && data.weekly_reports) {
        setWeeklyReports(Array.isArray(data.weekly_reports) ? data.weekly_reports : []);
        setUser(data.user);
        // Update cache with fresh data
        await AsyncStorage.setItem("cached_reports", JSON.stringify(data));
      } else if (data && data.error) {
        console.error("API Error:", data.error);
        if (!cachedReports) {
          setWeeklyReports([]);
        }
      } else {
        console.warn("Unexpected response format:", data);
        if (!cachedReports) {
          setWeeklyReports([]);
        }
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
      console.error("Error details:", err.message);
      // Keep using cached data if available
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
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

  const getCompletionStatus = (percent) => {
    if (percent >= 90) return "Excellent";
    if (percent >= 75) return "Good";
    if (percent >= 50) return "Fair";
    return "Poor";
  };

  const clamp = (v) => (isNaN(v) ? 0 : Math.max(0, Math.min(100, Math.round(v))));

  const computeFmsScore = (week) => {
    const completion = clamp(week.fms_planned > 0 ? (week.fms_completed / week.fms_planned) * 100 : 0);
    const onTime = clamp(week.fms_completed > 0 ? (week.fms_on_time / week.fms_completed) * 100 : 0);
    return Math.round((completion + onTime) / 2);
  };

  return (
    <View style={styles.container}>
      {width < 768 && (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.userInfo}>
              <Avatar.Text size={40} label={user && user.name ? user.name.charAt(0).toUpperCase() : "U"} style={styles.avatar} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.subtitle, { color: '#000000' }]}>Weekly performance overview</Text>
              </View>
            </View>
          </View>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.content, width >= 768 && styles.contentWide]}>
          {loading ? (
            <Surface style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </Surface>
          ) : !isWeeklyReportsArray || weeklyReports.length === 0 ? (
            <Surface style={styles.card}>
              <View style={styles.emptyState}>
                <Ionicons name="bar-chart-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No reports available yet</Text>
                <Text style={styles.emptySubtext}>Complete some tasks to see your performance</Text>
              </View>
            </Surface>
          ) : (
            <>
              <View style={styles.layoutRow}>
                <View style={[styles.rightColumn, width >= 768 ? { width: '33%' } : { width: '100%' }]}>
                  <Surface style={[styles.card, { padding: 0, backgroundColor: '#000' }]}>
                      <View style={[styles.cardHeader, { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#000' }]}>
                        <Ionicons name="analytics" size={20} color="#FFFFFF" />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Week-over-Week Comparison</Text>
                          <Text style={[styles.cardSubtitle, { color: '#FFFFFF' }]}>Last week vs current week</Text>
                        </View>
                      </View>
                      <Divider style={{ backgroundColor: '#444' }} />
                      <DataTable>
                        <DataTable.Header style={{ backgroundColor: '#111' }}>
                          <DataTable.Title style={{ color: '#FFFFFF', flexWrap: 'wrap', minWidth: 150 }}>Metric</DataTable.Title>
                          <DataTable.Title numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'], flexWrap: 'wrap', minWidth: 100 }}>Current Week</DataTable.Title>
                          <DataTable.Title numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'], flexWrap: 'wrap', minWidth: 100 }}>Last Week</DataTable.Title>
                        </DataTable.Header>
                        {lastWeek && currentWeek && (
                          <>
                            <DataTable.Row style={{ backgroundColor: '#222' }}>
                              <DataTable.Cell style={{ color: '#FFFFFF', fontWeight: '700' }}>Total Checklist tasks</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{currentWeek.planned ?? 0}</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{lastWeek.planned ?? 0}</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>task completed</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{currentWeek.actual ?? 0}</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{lastWeek.actual ?? 0}</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>Total task not completed %</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{currentWeek.planned > 0 ? Math.round(100 - (currentWeek.actual / currentWeek.planned) * 100) : 0}%</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{lastWeek.planned > 0 ? Math.round(100 - (lastWeek.actual / lastWeek.planned) * 100) : 0}%</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>Total task not completed on time%</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{currentWeek.on_time ?? 0}</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{lastWeek.on_time ?? 0}</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>completed on time percentage</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{currentWeek.actual > 0 ? Math.round(100 - (currentWeek.on_time / currentWeek.actual) * 100) : 0}%</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{lastWeek.actual > 0 ? Math.round(100 - (lastWeek.on_time / lastWeek.actual) * 100) : 0}%</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row style={{ backgroundColor: '#222', marginTop: 16 }}>
                              <DataTable.Cell style={{ color: '#FFFFFF', fontWeight: '700' }}>Total FMS tasks</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{currentWeek.fms_planned ?? 0}</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{lastWeek.fms_planned ?? 0}</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>task completed</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{currentWeek.fms_completed ?? 0}</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{lastWeek.fms_completed ?? 0}</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>completed percentage</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{currentWeek.fms_planned > 0 ? Math.round(100 - (currentWeek.fms_completed / currentWeek.fms_planned) * 100) : 0}%</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{lastWeek.fms_planned > 0 ? Math.round(100 - (lastWeek.fms_completed / lastWeek.fms_planned) * 100) : 0}%</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>total task completed on time</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{currentWeek.fms_on_time ?? 0}</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{lastWeek.fms_on_time ?? 0}</DataTable.Cell>
                            </DataTable.Row>
                            <DataTable.Row>
                              <DataTable.Cell style={{ color: '#FFFFFF' }}>completed on time percentage</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#87CEEB', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{currentWeek.fms_completed > 0 ? Math.round(100 - (currentWeek.fms_on_time / currentWeek.fms_completed) * 100) : 0}%</DataTable.Cell>
                              <DataTable.Cell numeric style={{ color: '#FFD700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>-{lastWeek.fms_completed > 0 ? Math.round(100 - (lastWeek.fms_on_time / lastWeek.fms_completed) * 100) : 0}%</DataTable.Cell>
                            </DataTable.Row>
                          </>
                        )}
                      </DataTable>
                    </Surface>
                  </View>
                </View>
           
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
// ...existing code...
  container: {
    flex: 1,
    // backgroundColor removed to allow gradient
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    // backgroundColor removed to allow gradient
    width: '100%',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: "#2563EB",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRowMobile: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#1E3A8A',
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
    letterSpacing: -0.3,
    textAlign: "left",
  },
  titleSmall: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    textAlign: "left",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 0,
    gap: 14,
    paddingBottom: 120,
  },
  contentWide: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    minWidth: 350,
    maxWidth: 450,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
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
  card: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 0,
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
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
  headerStats: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerStatsMobile: {
    marginTop: 12,
  },
  smallStat: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  smallStatLabel: {
    color: '#000000',
    fontSize: 11,
  },
  smallStatValue: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
    marginTop: 2,
  },
  tableContainer: {
    minWidth: 900,
  },
  tableRow: {
    height: 56,
  },
  mobileTableContainer: {
    padding: 10,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  mobileCard: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileCardTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  mobileCardRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mobileCardCol: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileCardLabel: {
    fontSize: 9,
    color: '#000000',
    marginBottom: 3,
    fontWeight: '500',
  },
  mobileCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  divider: {
    marginVertical: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#000000",
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  statsGridColumn: {
    flexDirection: 'column',
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#000000",
    borderRadius: 8,
    borderWidth: 0,
    borderColor: "transparent",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2563EB",
  },
  statLabel: {
    fontSize: 11,
    color: "#000000",
    marginTop: 6,
    textAlign: "center",
    fontWeight: "500",
  },
  statPercent: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  progressContainer: {
    padding: 20,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#568ee8",
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: "#000000",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
  },
  progressNote: {
    fontSize: 12,
    color: "#000000",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
});

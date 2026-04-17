import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Text, Surface, Divider, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";

export default function AdminDashboardHome() {
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState({
    activeDoors: 0,
    activeTasks: 0,
    pendingToday: 0,
    completionPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Fetch overview data from admin endpoint
      const data = await apiFetch("/admin_overview.php");
      
      if (data) {
        setStats({
          activeDoors: data.active_users || 0,
          activeTasks: data.active_templates || 0,
          pendingToday: data.pending_today || 0,
          completionPercent: data.completion_today || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
      // Set default values on error
      setStats({
        activeDoors: 0,
        activeTasks: 0,
        pendingToday: 0,
        completionPercent: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color, subtext }) => (
    <Surface style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
      </View>
    </Surface>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Overview</Text>
        <Text style={styles.subtitle}>System performance & activity summary</Text>
      </View>

      {loading ? (
        <Surface style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </Surface>
      ) : (
        <>
          {/* STATS GRID */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="people"
              label="Active Users"
              value={stats.activeDoors}
              color="#2563EB"
              subtext="Doers"
            />
            <StatCard
              icon="checklist"
              label="Active Tasks"
              value={stats.activeTasks}
              color="#10B981"
              subtext="Templates"
            />
            <StatCard
              icon="alert-circle"
              label="Pending Today"
              value={stats.pendingToday}
              color="#F59E0B"
              subtext="Due now"
            />
            <StatCard
              icon="trending-up"
              label="Completion"
              value={`${stats.completionPercent}%`}
              color="#8B5CF6"
              subtext="Today's rate"
            />
          </View>

          {/* RECENT ACTIVITY CARD */}
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="history" size={24} color="#2563EB" />
              <View>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                <Text style={styles.cardSubtitle}>Latest system events</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.activityContent}>
              <Text style={styles.emptyText}>Activity timeline coming soon</Text>
            </View>
          </Surface>

          {/* QUICK ACTIONS */}
          <Surface style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="lightning-bolt" size={24} color="#2563EB" />
              <View>
                <Text style={styles.cardTitle}>Quick Actions</Text>
                <Text style={styles.cardSubtitle}>Common admin tasks</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.actionsGrid}>
              <View style={styles.actionItem}>
                <View style={styles.actionIcon}>
                  <Ionicons name="add-circle" size={24} color="#2563EB" />
                </View>
                <Text style={styles.actionLabel}>Create Task</Text>
              </View>
              <View style={styles.actionItem}>
                <View style={styles.actionIcon}>
                  <Ionicons name="person-add" size={24} color="#10B981" />
                </View>
                <Text style={styles.actionLabel}>Assign Task</Text>
              </View>
              <View style={styles.actionItem}>
                <View style={styles.actionIcon}>
                  <Ionicons name="calendar" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.actionLabel}>Holidays</Text>
              </View>
              <View style={styles.actionItem}>
                <View style={styles.actionIcon}>
                  <Ionicons name="settings" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.actionLabel}>Settings</Text>
              </View>
            </View>
          </Surface>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginHorizontal: 0,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  divider: {
    marginVertical: 0,
  },
  activityContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  actionItem: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },
});

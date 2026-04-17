import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
} from "react-native";
import { Surface, Button, ProgressBar, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import apiFetch from "./apiFetch";

/**
 * UserLessonPlans
 * 
 * Displays the user's lesson plans, allowing browsing, assignment, and progress tracking of chapters and subtopics.
 * 
 * Props: None
 */
export default function UserLessonPlans() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;

  const [view, setView] = useState("my-chapters"); // my-chapters | chapter-detail
  const [previousView, setPreviousView] = useState("subjects");
  const [chapterDetail, setChapterDetail] = useState(null);
  const [userChapters, setUserChapters] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [assignedChapters, setAssignedChapters] = useState([]);
  const [allSubtopics, setAllSubtopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewContext, setViewContext] = useState("assigned"); // 'assigned'

  useEffect(() => {
    loadAssignedChapters();
  }, []);

  // Load all subtopics when assigned chapters are loaded
  useEffect(() => {
    if (assignedChapters.length > 0) {
      loadAllSubtopics();
    }
  }, [assignedChapters]);

  // Refresh sections whenever userChapters changes (after assignment)
  useEffect(() => {
    if (view === "sections-with-chapters" && selectedSubject) {
      console.log("🔄 userChapters updated, reloading sections for filter refresh");
      loadSectionsWithChapters(selectedSubject);
    }
  }, [userChapters, selectedSubject?.class_subject_id]);

  // Function to calculate planned dates based on lecture sequence, skipping holidays and Sundays
  const calculatePlannedDates = async (chapterData) => {
    try {
      // Fetch holidays from API
      const holidaysResponse = await apiFetch("/admin_get_holidays.php", { method: "GET" });
      const holidays = holidaysResponse?.holidays || [];
      const holidayDates = holidays.map(h => h.holiday_date);

      // Helper function to check if date is Sunday or holiday
      const isInvalidDate = (date) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const dateStr = date.toISOString().split('T')[0];
        return dayOfWeek === 0 || holidayDates.includes(dateStr);
      };

      // Helper function to get next valid date
      const getNextValidDate = (currentDate) => {
        const date = new Date(currentDate);
        do {
          date.setDate(date.getDate() + 1);
        } while (isInvalidDate(date));
        return date;
      };

      // Collect all subtopics with their lecture requirements
      const allSubtopics = [];
      chapterData.sections?.forEach(section => {
        section.topics?.forEach(topic => {
          topic.subtopics?.forEach(subtopic => {
            if (subtopic.lec_required && subtopic.lec_required > 0) {
              allSubtopics.push({
                ...subtopic,
                topic_name: topic.topic_name,
                section_name: section.section_name
              });
            }
          });
        });
      });

      // Sort by lecture number
      allSubtopics.sort((a, b) => (a.lec_required || 0) - (b.lec_required || 0));

      // Calculate planned dates starting from today
      let currentDate = new Date();
      // Start from next valid date if today is invalid
      if (isInvalidDate(currentDate)) {
        currentDate = getNextValidDate(currentDate);
      }

      const subtopicDateMap = {};
      allSubtopics.forEach(subtopic => {
        const dateStr = currentDate.toISOString().split('T')[0];
        subtopicDateMap[`${subtopic.topic_name}|||${subtopic.sub_topic}`] = dateStr;
        currentDate = getNextValidDate(currentDate);
      });

      // Update chapter data with calculated planned dates
      const updatedSections = chapterData.sections?.map(section => ({
        ...section,
        topics: section.topics?.map(topic => ({
          ...topic,
          subtopics: topic.subtopics?.map(subtopic => ({
            ...subtopic,
            planned_date: subtopicDateMap[`${topic.topic_name}|||${subtopic.sub_topic}`] || subtopic.planned_date
          }))
        }))
      }));

      return {
        ...chapterData,
        sections: updatedSections
      };

    } catch (error) {
      console.error("Error calculating planned dates:", error);
      // Return original data if calculation fails
      return chapterData;
    }
  };



  const loadChapterDetail = async (chapterId, subject = null) => {
    setLoading(true);

    const subj =
      subject ||
      selectedSubject ||
      (chapterDetail && chapterDetail.chapter ? {
        class_id: chapterDetail.chapter.class_id,
        subject_id: chapterDetail.chapter.subject_id,
      } : null);

    if (!subj || !subj.class_id || !subj.subject_id) {
      console.error("loadChapterDetail missing subject context", { subject, selectedSubject, chapterDetail });
      Alert.alert("Error", "No subject selected for chapter details");
      setLoading(false);
      return;
    }

    try {
      const params = [
        `class_id=${subj.class_id}`,
        `subject_id=${subj.subject_id}`,
        `chapter_no=${chapterId}`,
      ];
      if (subj.class_subject_id) {
        params.push(`class_subject_id=${subj.class_subject_id}`);
      }

      const data = await apiFetch(
        `/curriculum/get_chapter_progress.php?${params.join("&")}`,
        { method: "GET" }
      );

      if (!data || typeof data !== "object") {
        throw new Error("Invalid chapter data");
      }

      // Calculate planned dates based on lecture sequence
      const dataWithPlannedDates = await calculatePlannedDates(data);

      setSelectedChapter(chapterId);
      setSelectedSubject({ ...subj });
      setChapterDetail(dataWithPlannedDates);
      setPreviousView(view);
      setView("chapter-detail");
    } catch (err) {
      console.error("Error loading chapter:", err);
      Alert.alert("Error", "Failed to load chapter details: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedChapters = async () => {
    try {
      console.log("🔄 Loading assigned chapters...");
      const data = await apiFetch("/curriculum/get_user_chapters.php", {
        method: "GET",
      });
      console.log("📖 Assigned chapters API response:", data);
      if (Array.isArray(data)) {
        console.log(`✅ Loaded ${data.length} assigned chapters`);
        // Log each chapter's details for debugging
        data.forEach((ch, idx) => {
          console.log(
            `  [${idx}] Chapter ${ch.chapter_no} (type: ${typeof ch.chapter_no}), class_subject_id: ${ch.class_subject_id} (type: ${typeof ch.class_subject_id}), subject: ${ch.subject_name}`
          );
        });
        setUserChapters(data);
        setAssignedChapters(data);
      } else {
        console.warn("⚠️ API response is not an array:", data);
        console.warn("Response type:", typeof data);
        setUserChapters([]);
        setAssignedChapters([]);
      }
    } catch (err) {
      console.error("❌ Error loading assigned chapters:", err);
      console.error("Error details:", err.message);
      setUserChapters([]);
      setAssignedChapters([]);
    }
  };

  // Load all subtopics from all assigned chapters for the table view
  const loadAllSubtopics = async () => {
    setLoading(true);
    try {
      const allSubtopicsData = [];

      for (const chapter of assignedChapters) {
        try {
          const subject = {
            class_id: chapter.class_id,
            subject_id: chapter.subject_id,
            class_subject_id: chapter.class_subject_id,
          };

          const params = [
            `class_id=${subject.class_id}`,
            `subject_id=${subject.subject_id}`,
            `chapter_no=${chapter.chapter_no}`,
          ];
          if (subject.class_subject_id) {
            params.push(`class_subject_id=${subject.class_subject_id}`);
          }

          const chapterData = await apiFetch(
            `/curriculum/get_chapter_progress.php?${params.join("&")}`,
            { method: "GET" }
          );

          if (chapterData && Array.isArray(chapterData.sections)) {
            // Calculate planned dates for this chapter
            const dataWithPlannedDates = await calculatePlannedDates(chapterData);

            // Flatten the chapter data into individual subtopic rows
            dataWithPlannedDates.sections.forEach(section => {
              section.topics.forEach(topic => {
                topic.subtopics.forEach(subtopic => {
                  allSubtopicsData.push({
                    chapter_name: chapter.chapter_name || `Chapter ${chapter.chapter_no}`,
                    topic: topic.topic_name,
                    subtopic: subtopic.sub_topic,
                    chapter_no: chapter.chapter_no,
                    activity: subtopic.sub_topic, // Using subtopic as activity for now
                    planned_date: subtopic.planned_date || '-',
                    completed_date: subtopic.completed_date || '-',
                    status: subtopic.status || 'pending',
                    class_subject_id: chapter.class_subject_id,
                    chapter_no_ref: chapter.chapter_no,
                    topic_name: topic.topic_name,
                    sub_topic: subtopic.sub_topic,
                  });
                });
              });
            });
          }
        } catch (chapterError) {
          console.error(`Error loading chapter ${chapter.chapter_no}:`, chapterError);
          // Continue with other chapters
        }
      }

      // Sort by planned date to show sequence
      allSubtopicsData.sort((a, b) => {
        if (!a.planned_date || a.planned_date === '-') return 1;
        if (!b.planned_date || b.planned_date === '-') return -1;
        return new Date(a.planned_date) - new Date(b.planned_date);
      });

      setAllSubtopics(allSubtopicsData);
    } catch (error) {
      console.error("Error loading all subtopics:", error);
      setAllSubtopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSubtopicComplete = async (topicName, subTopicName) => {
    // Find the subtopic in allSubtopics to get the required context
    const subtopicData = allSubtopics.find(
      item => item.topic_name === topicName && item.sub_topic === subTopicName
    );

    if (!subtopicData) {
      console.error("Subtopic not found in allSubtopics:", { topicName, subTopicName });
      Alert.alert("Error", "Subtopic data not found");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        class_subject_id: Number(subtopicData.class_subject_id),
        chapter_no: Number(subtopicData.chapter_no_ref),
        topic: String(topicName),
        sub_topic: String(subTopicName),
      };

      console.log("📡 Marking subtopic complete payload:", payload);
      const result = await apiFetch("/curriculum/complete_subtopic.php", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result.success) {
        // Check if entire chapter is now complete
        if (result.chapter_complete) {
          Alert.alert("🎉 Success", "All subtopics completed! Chapter marked as complete");
        } else {
          Alert.alert("Success", "Subtopic marked complete");
        }

        // Update the local state to reflect the completion
        setAllSubtopics(prev =>
          prev.map(item =>
            item.topic_name === topicName && item.sub_topic === subTopicName
              ? { ...item, status: "completed", completed_date: new Date().toLocaleDateString() }
              : item
          )
        );
      } else {
        Alert.alert("Error", result.message || "Failed to mark subtopic complete");
      }
    } catch (err) {
      console.error("Error marking subtopic complete:", err);
      Alert.alert("Error", "Failed to mark subtopic complete: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const renderMyChaptersView = () => {
    return (
      <View>
        <View style={styles.tabBar}>
          <Text style={styles.sectionTitle}>Lesson Plan Sequence</Text>
        </View>

        {loading ? (
          <Surface style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading lesson plans...</Text>
          </Surface>
        ) : allSubtopics.length === 0 ? (
          <Surface style={styles.emptyState}>
            <Text style={styles.emptyText}>No lesson plans available</Text>
          </Surface>
        ) : (
          <ScrollView horizontal={true} style={styles.tableContainer}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.chapterCol]}>Chapter Name</Text>
                <Text style={[styles.tableHeaderCell, styles.topicCol]}>Topic</Text>
                <Text style={[styles.tableHeaderCell, styles.subtopicCol]}>Subtopic</Text>
                <Text style={[styles.tableHeaderCell, styles.chapterNoCol]}>Chapter No</Text>
                <Text style={[styles.tableHeaderCell, styles.activityCol]}>Activity</Text>
                <Text style={[styles.tableHeaderCell, styles.dateCol]}>Planned Date</Text>
                <Text style={[styles.tableHeaderCell, styles.statusCol]}>Status</Text>
                <Text style={[styles.tableHeaderCell, styles.actionCol]}>Action</Text>
              </View>

              {/* Table Rows */}
              {allSubtopics.map((item, index) => (
                <View key={`${item.chapter_no_ref}_${item.topic_name}_${item.sub_topic}_${index}`} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.chapterCol]}>{item.chapter_name}</Text>
                  <Text style={[styles.tableCell, styles.topicCol]}>{item.topic}</Text>
                  <Text style={[styles.tableCell, styles.subtopicCol]}>{item.subtopic}</Text>
                  <Text style={[styles.tableCell, styles.chapterNoCol]}>{item.chapter_no}</Text>
                  <Text style={[styles.tableCell, styles.activityCol]}>{item.activity}</Text>
                  <Text style={[styles.tableCell, styles.dateCol]}>{item.planned_date}</Text>
                  <Text style={[styles.tableCell, styles.statusCol]}>
                    {item.status === "completed" ? "✅ Completed" : "⏳ Pending"}
                  </Text>
                  <View style={[styles.tableCell, styles.actionCol]}>
                    {item.status !== "completed" ? (
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleMarkSubtopicComplete(item.topic_name, item.sub_topic)}
                        style={styles.doneButton}
                      >
                        Done
                      </Button>
                    ) : (
                      <Text style={styles.completedLabel}>Done</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          padding: isMobile ? 0 : 12,
          paddingBottom: insets.bottom + 10,
        }}
      >
        <Text style={styles.screenTitle}>My Lesson Plans</Text>
        {view === "my-chapters" && renderMyChaptersView()}
      </ScrollView>
    </SafeAreaView>
  );
}

const fontSystem = { 
  fontFamily: Platform.select({
    ios: "SF Pro Display",
    android: "Roboto",
    default: "System",
  })
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 20,
    color: "#0F172A",
    letterSpacing: -0.5,
    ...fontSystem,
  },
  tabBar: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.2,
    ...fontSystem,
  },
  activeTabText: {
    color: "#3B82F6",
    fontWeight: "800",
    ...fontSystem,
  },
  backButton: {
    marginBottom: 16,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginHorizontal: 12,
    marginBottom: 12,
    color: "#0F172A",
    letterSpacing: -0.5,
    ...fontSystem,
  },
  chapterHeaderContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
  },
  chapterTitleSection: {
    marginBottom: 12,
  },
  assignButtonTopSection: {
    paddingHorizontal: 4,
  },
  searchInput: {
    marginHorizontal: 8,
    marginBottom: 12,
  },
  subjectCard: {
    marginHorizontal: 8,
    marginBottom: 12,
  },
  chapterCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  chapterProgressCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    padding: 18,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderLeftWidth: 5,
    borderLeftColor: "#06B6D4",
  },
  cardContent: {
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    borderTopWidth: 3,
    borderTopColor: "#3B82F6",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
    ...fontSystem,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "500",
    ...fontSystem,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    ...fontSystem,
  },
  sectionCard: {
    marginVertical: 12,
    marginHorizontal: 8,
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#1F2937",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 4,
    borderLeftColor: "#6366F1",
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textTransform: "capitalize",
    letterSpacing: 0.3,
    ...fontSystem,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  chaptersContainer: {
    marginLeft: 16,
    marginTop: 8,
  },
  noChaptersCard: {
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    textTransform: "capitalize",
    ...fontSystem,
  },
  topicContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
    elevation: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: 0.2,
    ...fontSystem,
  },
  subtopicContainer: {
    marginBottom: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
  },
  subtopicText: {
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 6,
    fontWeight: "500",
    ...fontSystem,
    lineHeight: 20,
  },
  activityText: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 6,
    fontStyle: "italic",
    fontWeight: "500",
    ...fontSystem,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 12,
  },
  dateText: {
    fontSize: 12,
    color: "#475569",
    ...fontSystem,
  },
  statusContainer: {
    marginTop: 8,
  },
  doneButton: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingVertical: 2,
  },
  assignButton: {
    marginHorizontal: 8,
    marginVertical: 12,
    borderRadius: 10,
  },
  progressContainer: {
    marginVertical: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: "#E2E8F0",
  },
  progressText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "right",
    ...fontSystem,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 28,
    width: "85%",
    backgroundColor: "#FFFFFF",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 20,
    letterSpacing: -0.5,
    ...fontSystem,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
    letterSpacing: 0.2,
    ...fontSystem,
  },
  modalInput: {
    marginBottom: 20,
    backgroundColor: "#F8FAFC",
  },
  dateDisplayContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dateDisplayText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.5,
    ...fontSystem,
  },
  modalDescription: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    marginBottom: 20,
    textAlign: "center",
    ...fontSystem,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    marginHorizontal: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyText: {
    textAlign: "center",
    color: "#78716C",
    fontSize: 15,
    fontWeight: "600",
    ...fontSystem,
  },
  completedLabel: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "700",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: "hidden",
    ...fontSystem,
  },
  pendingLabel: {
    fontSize: 13,
    color: "#D97706",
    fontWeight: "700",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: "hidden",
    ...fontSystem,
  },
  lectureText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    ...fontSystem,
  },
  markCompleteButton: {
    marginTop: 12,
  },
  topicSection: {
    marginVertical: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  subtopicItem: {
    marginLeft: 12,
    marginBottom: 8,
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    elevation: 2,
  },
  tableCell: {
    fontSize: 12,
    color: "#334155",
    flexWrap: "wrap",
    paddingVertical: 6,
    paddingHorizontal: 4,
    ...fontSystem,
  },
  subtopicCol: {
    flex: 2,
    minWidth: 100,
  },
  activityCol: {
    flex: 1.5,
    minWidth: 80,
  },
  daysCol: {
    flex: 0.8,
    minWidth: 50,
    textAlign: "center",
  },
  dateCol: {
    flex: 1.2,
    minWidth: 70,
  },
  statusCol: {
    flex: 0.7,
    minWidth: 50,
  },
  headerCell: {
    fontWeight: "700",
    color: "#FFFFFF",
    ...fontSystem,
  },
  subtopicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#FAFBFC",
    borderRadius: 6,
  },
  tableScrollContainer: {
    marginBottom: 16,
  },
  tableWrapper: {
    minWidth: 500,
  },
  tableContainer: {
    marginHorizontal: 8,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#1F2937",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  table: {
    minWidth: 800,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 8,
    textAlign: "left",
    ...fontSystem,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  chapterCol: {
    flex: 1.5,
    minWidth: 120,
  },
  topicCol: {
    flex: 1.5,
    minWidth: 100,
  },
  chapterNoCol: {
    flex: 0.8,
    minWidth: 60,
    textAlign: "center",
  },
 
});



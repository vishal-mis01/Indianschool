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

  const [view, setView] = useState("subjects"); // subjects | my-chapters | chapter-detail
  const [previousView, setPreviousView] = useState("subjects");
  const [chapterDetail, setChapterDetail] = useState(null);
  const [userChapters, setUserChapters] = useState([]);
  const [userSubjects, setUserSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [assignedChapters, setAssignedChapters] = useState([]);
  const [allSubtopics, setAllSubtopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewContext, setViewContext] = useState("assigned"); // 'assigned'

  useEffect(() => {
    loadUserSubjects();
  }, []);

  // Load all subtopics when subject is selected - fetch entire syllabus (not just assigned chapters)
  useEffect(() => {
    if (selectedSubject) {
      loadAllSubtopics();
    }
  }, [selectedSubject]);

  // Refresh sections whenever userChapters changes (after assignment)
  useEffect(() => {
    if (view === "sections-with-chapters" && selectedSubject) {
      console.log("🔄 userChapters updated, reloading sections for filter refresh");
      loadSectionsWithChapters(selectedSubject);
    }
  }, [userChapters, selectedSubject?.class_subject_id]);

  // Function to calculate planned dates sequentially for chapter subtopics (without holidays for now)
  const calculatePlannedDates = async (chapterData) => {
    const holidayDates = [];

    const isInvalidDate = (date) => {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      return dayOfWeek === 0 || holidayDates.includes(dateStr);
    };

    const getNextValidDate = (currentDate) => {
      const date = new Date(currentDate);
      do {
        date.setDate(date.getDate() + 1);
      } while (isInvalidDate(date));
      return date;
    };

    const assignSequentialPlannedDates = (subtopics) => {
      let currentDate = new Date();
      if (isInvalidDate(currentDate)) {
        currentDate = getNextValidDate(currentDate);
      }

      return subtopics.map(subtopic => {
        const dateStr = currentDate.toISOString().split('T')[0];
        currentDate = getNextValidDate(currentDate);
        return {
          ...subtopic,
          planned_date: dateStr,
        };
      });
    };

    try {
      const allSubtopics = [];
      chapterData.sections?.forEach(section => {
        section.topics?.forEach(topic => {
          topic.subtopics?.forEach(subtopic => {
            allSubtopics.push({
              ...subtopic,
              topic_name: topic.topic_name,
              section_name: section.section_name,
            });
          });
        });
      });

      const datedSubtopics = assignSequentialPlannedDates(allSubtopics);
      let dateIndex = 0;

      const updatedSections = chapterData.sections?.map(section => ({
        ...section,
        topics: section.topics?.map(topic => ({
          ...topic,
          subtopics: topic.subtopics?.map(subtopic => ({
            ...subtopic,
            planned_date: datedSubtopics[dateIndex++]?.planned_date || subtopic.planned_date,
          })),
        })),
      }));

      return {
        ...chapterData,
        sections: updatedSections,
      };
    } catch (error) {
      console.error("Error calculating planned dates:", error);
      return chapterData;
    }
  };

  const assignSequentialDates = (rows) => {
    const holidayDates = [];

    const isInvalidDate = (date) => {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      return dayOfWeek === 0 || holidayDates.includes(dateStr);
    };

    const getNextValidDate = (currentDate) => {
      const date = new Date(currentDate);
      do {
        date.setDate(date.getDate() + 1);
      } while (isInvalidDate(date));
      return date;
    };

    let currentDate = new Date();
    if (isInvalidDate(currentDate)) {
      currentDate = getNextValidDate(currentDate);
    }

    return rows.map(row => {
      const dateStr = currentDate.toISOString().split('T')[0];
      currentDate = getNextValidDate(currentDate);
      return {
        ...row,
        planned_date: dateStr,
      };
    });
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

  const loadUserSubjects = async () => {
    try {
      console.log("🔄 Loading user subjects...");
      const data = await apiFetch("/curriculum/get_user_chapters.php", {
        method: "GET",
      });
      console.log("📚 User subjects API response:", data);

      if (Array.isArray(data)) {
        // Group chapters by subject to create subject cards
        const subjectsMap = new Map();

        data.forEach(chapter => {
          const subjectKey = `${chapter.class_subject_id}_${chapter.subject_name}`;
          if (!subjectsMap.has(subjectKey)) {
            subjectsMap.set(subjectKey, {
              class_subject_id: chapter.class_subject_id,
              subject_id: chapter.subject_id,
              class_id: chapter.class_id,
              subject_name: chapter.subject_name,
              class_name: chapter.class_name,
              chapters: [],
              total_subtopics: 0,
              completed_subtopics: 0,
            });
          }

          const subject = subjectsMap.get(subjectKey);
          subject.chapters.push(chapter);
          subject.total_subtopics += chapter.total_subtopics || 0;
          subject.completed_subtopics += chapter.completed_subtopics || 0;
        });

        const subjects = Array.from(subjectsMap.values());
        console.log(`✅ Loaded ${subjects.length} subjects`);
        setUserSubjects(subjects);
        setUserChapters(data);
        setAssignedChapters(data);
      } else {
        console.warn("⚠️ API response is not an array:", data);
        setUserSubjects([]);
        setUserChapters([]);
        setAssignedChapters([]);
      }
    } catch (err) {
      console.error("❌ Error loading user subjects:", err);
      setUserSubjects([]);
      setUserChapters([]);
      setAssignedChapters([]);
    }
  };

  const handleSelectSubject = (subject) => {
    console.log("💾 handleSelectSubject: Selected subject =", subject);
    setSelectedSubject(subject);
    setView("my-chapters");
  };

  // Load all subtopics from selected subject's chapters for the table view
  const loadAllSubtopics = async () => {
    if (!selectedSubject) {
      console.warn("No subject selected for loading subtopics");
      return;
    }

    setLoading(true);
    try {
      const allSubtopicsData = [];

      // Use the API to fetch entire subject curriculum at once
      const params = [
        `class_subject_id=${selectedSubject.class_subject_id}`,
        `fetch_all=1`
      ];

      console.log(`📚 Fetching chapters for class_subject_id: ${selectedSubject.class_subject_id}`);
      const subjectData = await apiFetch(
        `/curriculum/get_chapter_progress.php?${params.join("&")}`,
        { method: "GET" }
      );

      if (!subjectData.chapters || !Array.isArray(subjectData.chapters)) {
        console.error("❌ Invalid subject data structure:", subjectData);
        Alert.alert("Error", "Failed to load chapters. Please try again.");
        setAllSubtopics([]);
        setLoading(false);
        return;
      }

      // Flatten all chapters' subtopics into one array
      let sequenceCounter = 0;
      subjectData.chapters.forEach((chapter, chapterIndex) => {
        chapter.sections.forEach((section, sectionIndex) => {
          section.topics.forEach((topic, topicIndex) => {
            topic.subtopics.forEach((subtopic, subtopicIndex) => {
              allSubtopicsData.push({
                chapter_name: chapter.chapter_name,
                topic: topic.topic_name,
                subtopic: subtopic.sub_topic,
                chapter_no: chapter.chapter_no,
                activity: subtopic.sub_topic,
                planned_date: subtopic.planned_date || '-',
                completed_date: subtopic.completed_date || '-',
                status: subtopic.status || 'pending',
                class_subject_id: selectedSubject.class_subject_id,
                chapter_no_ref: chapter.chapter_no,
                topic_name: topic.topic_name,
                sub_topic: subtopic.sub_topic,
                section_name: section.section_type,
                sequence_order: sequenceCounter++,
                chapter_order: Number(chapter.chapter_no) || 0,
                section_order: sectionIndex,
                topic_order: topicIndex,
                subtopic_order: subtopicIndex,
              });
            });
          });
        });
      });

      const sequentialSubtopics = assignSequentialDates(allSubtopicsData);

      console.log(`✅ Loaded ${sequentialSubtopics.length} subtopics for subject: ${selectedSubject.subject_name}`);
      setAllSubtopics(sequentialSubtopics);
    } catch (error) {
      console.error("❌ Error loading all subtopics:", error);
      Alert.alert("Error", `Failed to load subtopics: ${error.message}`);
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

    console.log("subtopicData:", subtopicData);
    console.log("class_subject_id:", subtopicData.class_subject_id, "Number:", Number(subtopicData.class_subject_id));
    console.log("chapter_no_ref:", subtopicData.chapter_no_ref, "Number:", Number(subtopicData.chapter_no_ref));

    // Validate required fields
    if (!Number(subtopicData.class_subject_id) || !Number(subtopicData.chapter_no_ref)) {
      console.error("Invalid subtopic data - missing or zero required fields:", subtopicData);
      Alert.alert("Error", "Invalid subtopic data - class_subject_id or chapter_no is zero or missing");
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

  const renderSubjectCardsView = () => {
    return (
      <View>
        <View style={styles.tabBar}>
          <Text style={styles.sectionTitle}>My Subjects</Text>
        </View>

        {loading ? (
          <Surface style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading subjects...</Text>
          </Surface>
        ) : userSubjects.length === 0 ? (
          <Surface style={styles.emptyState}>
            <Text style={styles.emptyText}>No subjects assigned</Text>
          </Surface>
        ) : (
          <View style={styles.subjectsGrid}>
            {userSubjects.map((subject, index) => (
              <TouchableOpacity
                key={`${subject.class_subject_id}_${index}`}
                style={styles.subjectCard}
                onPress={() => handleSelectSubject(subject)}
              >
                <Surface style={styles.subjectCardSurface}>
                  <View style={styles.subjectCardHeader}>
                    <Text style={styles.subjectName}>{subject.subject_name}</Text>
                    <Text style={styles.className}>{subject.class_name}</Text>
                  </View>
                  <View style={styles.subjectCardStats}>
                    <Text style={styles.subjectStat}>
                      {subject.chapters.length} Chapters
                    </Text>
                    <Text style={styles.subjectStat}>
                      {subject.completed_subtopics}/{subject.total_subtopics} Topics
                    </Text>
                  </View>
                  <ProgressBar
                    progress={
                      subject.total_subtopics > 0
                        ? subject.completed_subtopics / subject.total_subtopics
                        : 0
                    }
                    color="#2196F3"
                    style={styles.subjectProgressBar}
                  />
                </Surface>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderMyChaptersView = () => {
    return (
      <View>
        <Button
          mode="outlined"
          onPress={() => setView("subjects")}
          style={styles.backButton}
          icon="arrow-left"
        >
          Back to Subjects
        </Button>
        <View style={styles.tabBar}>
          <Text style={styles.sectionTitle}>
            {selectedSubject ? `${selectedSubject.subject_name} - Lesson Plan Sequence` : 'Lesson Plan Sequence'}
          </Text>
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

  const styles = getStyles(isMobile);

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
        {view === "subjects" && renderSubjectCardsView()}
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

const getStyles = (isMobile) => StyleSheet.create({
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
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  subjectCard: {
    width: isMobile ? "100%" : "48%",
    marginHorizontal: 4,
    marginBottom: 12,
  },
  subjectCardSurface: {
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  subjectCardHeader: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    ...fontSystem,
  },
  className: {
    fontSize: 14,
    color: "#64748B",
    ...fontSystem,
  },
  subjectCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subjectStat: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
    ...fontSystem,
  },
  subjectProgressBar: {
    height: 6,
    borderRadius: 3,
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
  actionCol: {
    flex: 1,
    minWidth: 80,
  },
});



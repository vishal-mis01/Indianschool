import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Alert, TextInput } from "react-native";
import {
  Text,
  Card,
  Button,
  Surface,
  Chip,
  Divider,
  ProgressBar,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import apiFetch from "./apiFetch";

export default function FormResponsesViewer({ formId, onBack }) {
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  // TODO: Replace with actual user role from context/props
  const userRole = window?.userRole || "admin";

  /* LOAD RESPONSES */
  useEffect(() => {
    if (!formId) return;
    loadResponses();
  }, [formId]);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(
        `/forms/get_form_responses.php?form_id=${formId}`
      );
      if (res.success) {
        setForm(res.form);
        setSubmissions(res.submissions || []);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load responses");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetails = async (submissionId) => {
    try {
      const res = await apiFetch(
        `/forms/get_submission_details.php?submission_id=${submissionId}`
      );
      if (res.success) {
        setSubmissionDetails(res);
        setSelectedSubmission(submissionId);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load submission");
    }
  };

  /* ANALYTICS */
  const getAnalytics = () => {
    if (!submissions.length) return null;

    return {
      totalResponses: submissions.length,
      averageCompletionTime: "N/A",
      lastResponse: submissions[0]?.created_at,
    };
  };

  const analytics = getAnalytics();

  return (
    <ScrollView style={styles.container}>
      {/* BACK BUTTON */}
      <Button onPress={onBack} style={styles.backButton}>
        ← Back
      </Button>

      {!selectedSubmission ? (
        <>
          {/* FORM HEADER */}
          {form && (
            <Surface style={styles.header}>
              <Text style={styles.formName}>{form.name}</Text>
              <Text style={styles.responseCount}>
                {submissions.length} response{submissions.length !== 1 ? "s" : ""}
              </Text>
            </Surface>
          )}

          {/* ANALYTICS SUMMARY */}
          {analytics && (
            <Card style={styles.analyticsCard}>
              <Card.Content>
                <Text style={styles.analyticsTitle}>Summary</Text>
                <Divider style={styles.divider} />

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Responses</Text>
                  <Text style={styles.statValue}>
                    {analytics.totalResponses}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Last Response</Text>
                  <Text style={styles.statValue}>
                    {new Date(analytics.lastResponse).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Completion Rate</Text>
                  <Text style={styles.statValue}>100%</Text>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* RESPONSES LIST */}
          {submissions.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Responses</Text>
              {submissions.map((submission) => (
                <Card
                  key={submission.id}
                  style={styles.responseCard}
                  onPress={() => loadSubmissionDetails(submission.id)}
                >
                  <Card.Content>
                    <View style={styles.responseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.responderName}>
                          {submission.user_name || "Anonymous"}
                        </Text>
                        <Text style={styles.responderEmail}>
                          {submission.user_email || "No email"}
                        </Text>
                        <Text style={styles.responseDate}>
                          {new Date(submission.created_at).toLocaleString()}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#666"
                      />
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          ) : (
            <Surface style={styles.emptyState}>
              <MaterialCommunityIcons
                name="inbox-outline"
                size={48}
                color="#ccc"
              />
              <Text style={styles.emptyStateText}>No responses yet</Text>
              <Button onPress={loadResponses}>Refresh</Button>
            </Surface>
          )}
        </>
      ) : (
        /* SUBMISSION DETAILS */
        submissionDetails && (
          <>
            {/* RESPONSE HEADER */}
            <Card style={styles.detailsHeader}>
              <Card.Content>
                <Button
                  mode="text"
                  onPress={() => {
                    setSelectedSubmission(null);
                    setSubmissionDetails(null);
                  }}
                  style={styles.backDetailButton}
                >
                  ← Back to Responses
                </Button>

                <Text style={styles.detailsTitle}>Response Details</Text>
                <Text style={styles.detailsResponder}>
                  {submissionDetails.submission.user_name || "Anonymous"}
                </Text>
                <Text style={styles.detailsDate}>
                  {new Date(
                    submissionDetails.submission.created_at
                  ).toLocaleString()}
                </Text>
              </Card.Content>
            </Card>

            {/* ANSWERS */}
            {submissionDetails.values && submissionDetails.values.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Answers</Text>
                <View style={{width: '100%', marginBottom: 20}}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{width: '100%'}}> 
                    <View style={{minWidth: 600}}>
                    <View style={{flexDirection: 'row', backgroundColor: '#e3eafc', padding: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6}}>
                      <Text style={{width: 40, fontWeight: 'bold'}}>#</Text>
                      <Text style={{flex: 2, fontWeight: 'bold'}}>Question</Text>
                      <Text style={{flex: 1, fontWeight: 'bold'}}>Type</Text>
                      <Text style={{flex: 2, fontWeight: 'bold'}}>Answer</Text>
                      {(userRole === "admin" || userRole === "process_coordinator") && <Text style={{width: 60}}></Text>}
                    </View>
                    {submissionDetails.values.map((value, idx) => (
                      <View key={value.field_id || `field-${idx}`} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: idx%2===0?'#f9f9f9':'#fff', padding: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', minWidth: 600}}>
                        <Text style={{width: 40}}>{idx + 1}</Text>
                        <Text style={{flex: 2}}>{value.label}</Text>
                        <Text style={{flex: 1}}>{value.field_type}</Text>
                        <View style={{flex: 2, flexDirection: 'row', alignItems: 'center'}}>
                          {editingIdx === idx ? (
                            <>
                              <TextInput
                                style={{flex:1, borderWidth:1, borderColor:'#ccc', borderRadius:4, padding:6, backgroundColor:'#fff'}}
                                value={editValue}
                                onChangeText={setEditValue}
                                autoFocus
                              />
                              <Button
                                mode="contained"
                                style={{marginLeft:8}}
                                onPress={async () => {
                                  try {
                                    const res = await apiFetch("/forms/update_submission_value.php", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        submission_id: submissionDetails.submission.id,
                                        field_id: value.field_id,
                                        value: editValue
                                      })
                                    });
                                    if (res.success) {
                                      // Update UI
                                      const updated = [...submissionDetails.values];
                                      updated[idx].value = editValue;
                                      setSubmissionDetails({ ...submissionDetails, values: updated });
                                      setEditingIdx(null);
                                    } else {
                                      Alert.alert("Error", res.error || "Failed to update");
                                    }
                                  } catch (e) {
                                    Alert.alert("Error", e.message || "Failed to update");
                                  }
                                }}
                              >Save</Button>
                              <Button mode="text" onPress={() => setEditingIdx(null)}>Cancel</Button>
                            </>
                          ) : (
                            <>
                              <Text style={styles.answer}>{value.value || "(empty)"}</Text>
                            </>
                          )}
                        </View>
                        {(userRole === "admin" || userRole === "process_coordinator") && editingIdx !== idx && (
                          <Button
                            mode="text"
                            style={{marginLeft:8}}
                            onPress={() => {
                              setEditingIdx(idx);
                              setEditValue(value.value || "");
                            }}
                          >Edit</Button>
                        )}
                      </View>
                    ))}
                  </View>
                  </ScrollView>
                </View>
              </>
            ) : (
              <Text style={styles.noAnswers}>No answers recorded</Text>
            )}

            {/* EXPORT BUTTON */}
            <Button
              mode="outlined"
              style={styles.exportButton}
              onPress={() =>
                Alert.alert(
                  "Export",
                  "Export as PDF/CSV feature coming soon"
                )
              }
            >
              Export Response
            </Button>
          </>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f5f5f5",
  },
  backButton: {
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  header: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  formName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  responseCount: {
    fontSize: 16,
    color: "#666",
  },
  analyticsCard: {
    marginBottom: 20,
    borderRadius: 8,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  divider: {
    marginVertical: 10,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
  },
  responseCard: {
    marginBottom: 10,
    borderRadius: 8,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  responderName: {
    fontSize: 15,
    fontWeight: "600",
  },
  responderEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 3,
  },
  responseDate: {
    fontSize: 11,
    color: "#bbb",
    marginTop: 3,
  },
  emptyState: {
    padding: 40,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginVertical: 15,
  },
  detailsHeader: {
    marginBottom: 15,
    borderRadius: 8,
  },
  backDetailButton: {
    marginBottom: 10,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  detailsResponder: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  detailsDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 3,
  },
  answerCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 10,
    color: "#666",
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  fieldTypeChip: {
    marginTop: 5,
  },
  answerValue: {
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  answer: {
    fontSize: 13,
    color: "#333",
  },
  noAnswers: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 40,
  },
  exportButton: {
    marginVertical: 20,
  },
});

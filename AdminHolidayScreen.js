import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import axios from "axios";

import apiFetch from "./apiFetch";
import { API_BASE } from "./apiConfig";
import { ADMIN_BUTTON_MAX_WIDTH } from "./adminConfig";


export default function AdminHolidayScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const formatDate = (d) => {
    return d.toISOString().split('T')[0];
  };

  const isValidDate = (dateString) => {
    if (!dateString) return false;
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(dateString)) return false;
    const [, day, month, year] = dateString.match(regex);
    const dateObj = new Date(`${year}-${month}-${day}`);
    return dateObj instanceof Date && !isNaN(dateObj);
  };

  const formatDateForBackend = (dateStr) => {
    if (!dateStr) return "";
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  const submit = async () => {
    if (!date) {
      alert("Please enter a date");
      return;
    }

    if (!isValidDate(date)) {
      alert("Date format should be DD/MM/YYYY");
      return;
    }

    try {
      await apiFetch("/admin_add_holiday.php", {
        method: "POST",
        body: {
          holiday_date: formatDateForBackend(date),
          description: description || "",
        },
      });

      alert("Holiday added successfully!");
      setDate("");
      setDescription("");
    } catch (err) {
      alert("Failed to add holiday: " + err.message);
    }
  };

  return (
    <View style={styles.card}>
      <Text variant="titleLarge">Add Holiday</Text>

      <Text style={styles.label}>Holiday Date (DD/MM/YYYY) *</Text>
      <TextInput
        label="Date"
        value={date}
        onChangeText={(text) => setDate(text)}
        placeholder="DD/MM/YYYY"
        style={styles.input}
        left={<TextInput.Icon icon="calendar" />}
      />

      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />

      <Button mode="contained" onPress={submit} style={{ maxWidth: ADMIN_BUTTON_MAX_WIDTH }}>
        Add Holiday
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 8,
    maxWidth: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 8,
    color: "#374151",
  },
  input: {
    marginVertical: 8,
    maxWidth: 500,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
  },
  inputHalf: {
    flex: 1,
    marginVertical: 0,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 8,
    justifyContent: "center",
  },
  datePickerText: {
    fontSize: 14,
    color: "#374151",
  },
});

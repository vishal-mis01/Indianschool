import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "./apiConfig";
import apiFetch from "./apiFetch";

const API = API_BASE;

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [showMagicLink, setShowMagicLink] = useState(false);

  useEffect(() => {
    // Load remembered email on component mount
    const loadRememberedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("remembered_email");
        if (savedEmail) {
          setEmail(savedEmail);
        }
      } catch (e) {
        console.error("Failed to load remembered email:", e);
      }
    };
    loadRememberedEmail();
  }, []);

  async function login() {
    try {
      setLoading(true);
      setError(null);

      console.log("🔐 Attempting login for:", email);
      console.log("🌐 API URL:", `${API}/login.php`);

      const res = await fetch(`${API}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("📡 Login response status:", res.status);
      const text = await res.text();
      console.log("📄 Raw response:", text);

      if (!text.trim()) throw new Error("Empty response");

      const data = JSON.parse(text);
      console.log("📋 Parsed response:", data);

      if (!(data.token && data.user_id && data.role)) {
        throw new Error(data.message || "Login failed - missing required fields");
      }

      console.log("✅ Login successful, storing auth data...");
      await AsyncStorage.setItem("auth_token", data.token);
      await AsyncStorage.setItem("role", data.role);
      await AsyncStorage.setItem("user_id", String(data.user_id));

      // Remember email if checkbox is checked
      if (rememberEmail) {
        await AsyncStorage.setItem("remembered_email", email);
      } else {
        await AsyncStorage.removeItem("remembered_email");
      }

      if (data.role !== "admin") {
        try {
          const reportsRes = await apiFetch(
            `/get_user_report.php?user_id=${data.user_id}`
          );
          if (reportsRes.success) {
            await AsyncStorage.setItem(
              "cached_reports",
              JSON.stringify(reportsRes.data || [])
            );
          }
        } catch {}
      }

      onLogin({ user_id: data.user_id, role: data.role });
      
      // Show success message briefly
      setSuccessMessage("Login successful! You'll stay signed in and your email will be remembered.");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function requestMagicLink() {
    try {
      setLoading(true);
      setError(null);

      if (!email.trim()) {
        throw new Error("Please enter your email address");
      }

      const res = await fetch(`${API}/request_login_link.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const text = await res.text();
      if (!text.trim()) throw new Error("Empty response");

      const data = JSON.parse(text);

      if (!data.success) {
        throw new Error(data.message || "Failed to send login link");
      }

      setSuccessMessage("Login link sent! Check your email and click the link to sign in.");
      setShowMagicLink(false);
      
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.background}>
          <View style={styles.card}>
            {!logoError && (
              <Image
                source={{
                  uri: "https://indiangroupofschools.com/api/uploads/logo.jpg",
                }}
                style={styles.logo}
                onError={() => setLogoError(true)}
              />
            )}

            <Text style={styles.title}>Login</Text>

            {error && <Text style={styles.error}>{error}</Text>}
            {successMessage && <Text style={styles.success}>{successMessage}</Text>}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.show}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setRememberEmail(!rememberEmail)}
              >
                <View style={[styles.checkboxBox, rememberEmail && styles.checkboxChecked]}>
                  {rememberEmail && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember my email</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={login}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>LOGIN</Text>
              )}
            </TouchableOpacity>

            {!showMagicLink ? (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => setShowMagicLink(true)}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password? Send Login Link</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.magicLinkContainer}>
                <Text style={styles.magicLinkTitle}>Get a secure login link</Text>
                <Text style={styles.magicLinkDescription}>
                  We'll send a secure link to your email that you can click to sign in instantly.
                </Text>
                
                <TouchableOpacity
                  style={styles.button}
                  onPress={requestMagicLink}
                  disabled={loading || !email.trim()}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>SEND LOGIN LINK</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => setShowMagicLink(false)}
                >
                  <Text style={styles.cancelLinkText}>Back to password login</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#2563eb", // base blue
  },

  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },

  logo: {
    width: 90,
    height: 90,
    borderRadius: 18,
    marginBottom: 16,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
  },

  input: {
    width: "100%",
    height: 48,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 16,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 12,
    marginBottom: 8,
  },

  checkbox: {
    flexDirection: "row",
    alignItems: "center",
  },

  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  checkboxChecked: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },

  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  checkboxLabel: {
    color: "#64748b",
    fontSize: 14,
  },

  show: {
    marginLeft: 10,
    color: "#f97316", // logo orange
    fontWeight: "600",
  },

  button: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: "#1d4ed8", // deeper blue
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  error: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },

  success: {
    color: "#16a34a",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },

  forgotPassword: {
    marginTop: 16,
    paddingVertical: 8,
  },

  forgotPasswordText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },

  magicLinkContainer: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },

  magicLinkTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },

  magicLinkDescription: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },

  cancelLink: {
    marginTop: 16,
    paddingVertical: 8,
  },

  cancelLinkText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});

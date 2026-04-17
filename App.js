import React, { useState, useEffect, useRef, useCallback } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet, Linking, Platform } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import apiFetch from "./apiFetch";


import LoginScreen from "./LoginScreen";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
// Placeholder import for coordinator dashboard
import ProcessCoordinatorDashboard from "./ProcessCoordinatorDashboard";
import EDashboard from "./EDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const userRef = useRef(null);

  // Keep ref in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Move processLoginToken outside useEffect
  const processLoginToken = useCallback(async (token) => {
    try {
      setLoadingMessage("Signing you in with secure link...");
      console.log("🔗 Processing login token...");

      const response = await apiFetch(`/login-link.php?token=${encodeURIComponent(token)}`);
      
      if (response.success && response.token && response.user_id && response.role) {
        console.log("✅ Login link valid, signing in user");
        
        await AsyncStorage.setItem("auth_token", response.token);
        await AsyncStorage.setItem("role", response.role);
        await AsyncStorage.setItem("user_id", String(response.user_id));

        // Cache reports for non-admin users
        if (response.role !== "admin") {
          try {
            const reportsRes = await apiFetch(`/get_user_report.php?user_id=${response.user_id}`);
            if (reportsRes.success) {
              await AsyncStorage.setItem("cached_reports", JSON.stringify(reportsRes.data || []));
            }
          } catch {}
        }

        setUser({ user_id: response.user_id, role: response.role });
        return true;
      } else {
        console.log("❌ Invalid or expired login link");
        return false;
      }
    } catch (error) {
      console.error("Login token processing failed:", error);
      return false;
    }
  }, []);

  // Helper to clear stored auth
  const clearStoredAuth = useCallback(async () => {
    console.log("🧹 Clearing stored auth data");
    await AsyncStorage.multiRemove(["auth_token", "role", "user_id", "cached_reports"]);
    setUser(null);
  }, []);

  // Main auth check and login link handling
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoadingMessage("Checking authentication...");
        const token = await AsyncStorage.getItem("auth_token");
        const role = await AsyncStorage.getItem("role");
        const userId = await AsyncStorage.getItem("user_id");

        if (token && role && userId && userId !== "undefined") {
          // Validate the stored token with the server
          try {
            setLoadingMessage("Signing you in...");
            console.log("🔄 Validating stored auth token...");
            console.log("📋 Stored data:", { token: token.substring(0, 20) + "...", role, userId });

            const validationResponse = await apiFetch(`/get_user_report.php`);

            if (validationResponse.success) {
              console.log("✅ Token valid, auto-logging in user");
              setUser({ user_id: userId, role });
            } else {
              console.log("❌ Token invalid, clearing stored data. Response:", validationResponse);
              await clearStoredAuth();
            }
          } catch (validationError) {
            console.log("❌ Token validation failed:", validationError.message);
            console.log("🔍 Validation error details:", validationError);
            await clearStoredAuth();
          }
        } else {
          console.log("ℹ️ No stored auth data found or invalid data:", { hasToken: !!token, role, userId, isUndefined: userId === "undefined" });
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        await clearStoredAuth();
      } finally {
        setLoading(false);
      }
    };

    // Check for login token in URL (web) or deep link
    const checkForLoginToken = async () => {
      try {
        let token = null;

        // For web, check URL parameters directly
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          token = urlParams.get('token');
        } else {
          // For mobile, use Linking API
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            const url = new URL(initialUrl);
            token = url.searchParams.get('token');
          }
        }

        if (token) {
          console.log("🔗 Found login token in URL");
          const success = await processLoginToken(token);
          if (success && Platform.OS === 'web' && typeof window !== 'undefined') {
            // For web, clear the token from URL to prevent re-processing on refresh
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, '', url.pathname + url.hash);
          } else if (success) {
            // For mobile, clear URL if needed
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const url = new URL(initialUrl);
              Linking.openURL(url.origin + url.pathname);
            }
          }
          return;
        }
      } catch (error) {
        console.error("URL parsing failed:", error);
      }
    };

    (async () => {
      await checkForLoginToken();
      await checkAuth();
    })();

    // Listen for deep links while app is running
    const handleDeepLink = async (event) => {
      const url = event.url;
      try {
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get('token');
        if (token && !userRef.current) { // Only process if not already logged in
          console.log("🔗 Received login token via deep link");
          await processLoginToken(token);
        }
      } catch (error) {
        console.error("Deep link parsing failed:", error);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription?.remove();
    };
  }, [processLoginToken, clearStoredAuth, userRef]);

  // Debug function to clear auth (can be called from console)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.clearAuth = clearStoredAuth;
      window.checkAuth = async () => {
        const token = await AsyncStorage.getItem("auth_token");
        const role = await AsyncStorage.getItem("role");
        const userId = await AsyncStorage.getItem("user_id");
        console.log("🔍 Current auth state:", { token: token?.substring(0, 20) + "...", role, userId });
        return { token, role, userId };
      };
    }
  }, [clearStoredAuth]);

  const handleLogin = async (userData) => {
    try {
      if (!userData.user_id || userData.user_id === "undefined") return;

      await AsyncStorage.setItem("user_id", String(userData.user_id));
      setUser(userData);
    } catch (e) {
      console.error("Login save failed:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(["auth_token", "role", "user_id", "cached_reports", "remembered_email"]);
      setUser(null);
      console.log("👋 User logged out successfully");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <View style={styles.root}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 16 }}>
              {loadingMessage}
            </Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <View style={styles.root}>
          {!user ? (
            <LoginScreen onLogin={handleLogin} />
          ) : user.role === "admin" ? (
            <AdminDashboard user={user} onLogout={handleLogout} />
          ) : user.role === "process_coordinator" ? (
            <ProcessCoordinatorDashboard user={user} onLogout={handleLogout} />
          ) : user.role === "ea" || user.role === "md" ? (
            <EDashboard user={user} onLogout={handleLogout} />
          ) : (
            <UserDashboard user={user} onLogout={handleLogout} />
          )}
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});


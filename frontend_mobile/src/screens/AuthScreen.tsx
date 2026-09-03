import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { RootStackParamList, User } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SIZES } from '../constants/theme';
import { upsertLocalUser, getLocalUser } from '../db/index';
import { API_BASE_URL as API_BASE } from '../services/api';

const JWT_STORE_KEY = 'kaaval_jwt_v1';

type AuthScreenProp = StackNavigationProp<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: { navigation: AuthScreenProp }) {
  const { setUser } = useApp();

  // Login phases: 1 = credentials, 2 = biometric (admin), 3 = OTP
  const [phase, setPhase]     = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');

  const [tempUser, setTempUser] = useState<User | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);

  // ─── OFFLINE SESSION RESTORE ────────────────────────────────────────────
  // On mount, check if a valid JWT + cached user profile exist.
  // If so, log in locally without any network round-trip.
  useEffect(() => {
    const tryRestoreSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(JWT_STORE_KEY);
        if (!storedToken) return;

        // Decode payload without verification (just to read expiry + userId)
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        if (Date.now() > expiresAt) {
          // Token expired — clear it and show login
          await SecureStore.deleteItemAsync(JWT_STORE_KEY);
          return;
        }

        // Load user profile from local SQLite
        const localUser = await getLocalUser(payload.userId);
        if (localUser) {
          setUser({
            id:          localUser.user_id,
            name:        localUser.name,
            role:        localUser.role as any,
            email:       localUser.username,
            designation: localUser.designation,
          });
          navigation.replace('Dashboard');
        }
      } catch (e) {
        // Session restore failed — proceed to login screen normally
        console.log('[AuthScreen] Session restore skipped:', (e as Error).message);
      }
    };
    tryRestoreSession();
  }, []);

  // ─── PHASE 1: CREDENTIALS ────────────────────────────────────────────────
  const handleCredentialCheck = async () => {
    setLoading(true);
    try {
      // Attempt online login against unified backend API
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        Alert.alert('Access Denied', body.message || 'Invalid credentials');
        return;
      }

      const { user, token } = await res.json();

      // Cache JWT securely and user profile in local SQLite
      await SecureStore.setItemAsync(JWT_STORE_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      const userId = user.user_id || user.id;
      const roleStr = (user.role || 'POLICE').toString();
      const badgeNum = user.badge_number || user.badgeNumber || null;

      // Cache JWT securely and user profile in local SQLite
      await SecureStore.setItemAsync(JWT_STORE_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await upsertLocalUser({
        user_id:      userId,
        username:     user.email || user.username,
        name:         user.name,
        role:         roleStr,
        designation:  user.designation || '',
        badge_number: badgeNum,
      });

      // Map to the shape the rest of the app expects
      const mappedUser: User = {
        id:          userId,
        name:        user.name,
        role:        roleStr.toLowerCase() as any,
        email:       user.email || user.username,
        designation: user.designation,
        badgeNumber: badgeNum || undefined,
      };

      setTempUser(mappedUser);
      setTempToken(token);

      // Admins require biometrics next; others go straight to OTP
      if (roleStr.toUpperCase() === 'ADMIN') {
        setPhase(2);
      } else {
        setPhase(3);
      }
    } catch (e: any) {
      // Network unavailable — check if we have a cached offline profile
      const storedToken = await SecureStore.getItemAsync(JWT_STORE_KEY).catch(() => null);
      if (storedToken) {
        Alert.alert(
          'Offline Mode',
          'Cannot reach server. Your previous session will be used to log you in.',
          [{ text: 'Continue Offline', onPress: () => tryOfflineLogin(storedToken) }]
        );
      } else {
        Alert.alert('No Connection', 'Could not connect to server and no offline session found.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tryOfflineLogin = async (storedToken: string) => {
    try {
      const payload   = JSON.parse(atob(storedToken.split('.')[1]));
      const localUser = await getLocalUser(payload.userId);
      if (!localUser) {
        Alert.alert('Error', 'No local user profile found. Please connect to the internet to log in.');
        return;
      }
      const mappedUser: User = {
        id:          localUser.user_id,
        name:        localUser.name,
        role:        localUser.role.toLowerCase() as any,
        email:       localUser.username,
        designation: localUser.designation,
      };
      setUser(mappedUser);
      navigation.replace('Dashboard');
    } catch (e) {
      Alert.alert('Error', 'Offline login failed. Please connect to the server.');
    }
  };

  // ─── PHASE 2: BIOMETRICS (ADMIN ONLY) ────────────────────────────────────
  const handleBiometricCheck = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Info', 'Biometric hardware not found. Proceeding to OTP.');
        setPhase(3);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate Admin Access',
        fallbackLabel: 'Use Passcode',
      });
      if (result.success) {
        setPhase(3);
      } else {
        Alert.alert('Failed', 'Biometric authentication failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Biometric error. Proceeding to OTP.');
      setPhase(3);
    }
  };

  // ─── PHASE 3: OTP ────────────────────────────────────────────────────────
  // NOTE: OTP is mocked (1234) in this phase — connect to an SMS/TOTP service
  // in production.
  const handleOtpCheck = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (otp === '1234') {
        setUser(tempUser!);
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', "Invalid OTP. (Demo: use '1234')");
      }
    }, 600);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const renderPhase1 = () => (
    <>
      <Text style={styles.label}>Official Email ID</Text>
      <TextInput
        style={styles.input}
        placeholder="officer@police.tn.gov"
        placeholderTextColor={COLORS.textDim}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••••"
        placeholderTextColor={COLORS.textDim}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.btnMain} onPress={handleCredentialCheck} disabled={loading}>
        {loading
          ? <ActivityIndicator color={COLORS.background} />
          : <Text style={styles.btnText}>Proceed to Verify</Text>}
      </TouchableOpacity>
    </>
  );

  const renderPhase2 = () => (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <Ionicons name="finger-print" size={80} color={COLORS.primary} />
      <Text style={[styles.label, { marginTop: 20, textAlign: 'center' }]}>
        Admin Access Requires Biometric Verification
      </Text>
      <TouchableOpacity style={styles.btnMain} onPress={handleBiometricCheck}>
        <Text style={styles.btnText}>Scan Fingerprint / Face</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhase3 = () => (
    <>
      <Text style={[styles.label, { textAlign: 'center', marginBottom: 20 }]}>
        Enter OTP sent to {tempUser?.email}
      </Text>
      <TextInput
        style={[styles.input, { textAlign: 'center', letterSpacing: 5, fontSize: 24, fontWeight: 'bold' }]}
        placeholder="----"
        placeholderTextColor={COLORS.textDim}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TouchableOpacity style={styles.btnMain} onPress={handleOtpCheck} disabled={loading}>
        {loading
          ? <ActivityIndicator color={COLORS.background} />
          : <Text style={styles.btnText}>Verify & Login</Text>}
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', color: COLORS.textDim, marginTop: 10 }}>(Demo OTP: 1234)</Text>
    </>
  );

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>ChainGuard</Text>
          <Text style={styles.subtitle}>Tamper-Proof Digital Evidence</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>
            {phase === 1 ? 'Secure Login' : phase === 2 ? 'Biometric Check' : '2FA Verification'}
          </Text>
          {phase === 1 && renderPhase1()}
          {phase === 2 && renderPhase2()}
          {phase === 3 && renderPhase3()}
          {phase > 1 && (
            <TouchableOpacity onPress={() => { setPhase(1); setTempUser(null); setOtp(''); }} style={styles.switchBtn}>
              <Text style={styles.link}>Cancel & Restart Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent:   { flexGrow: 1, justifyContent: 'center' },
  headerContainer: { marginBottom: 40, alignItems: 'center' },
  title:           { fontSize: SIZES.h1, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
  subtitle:        { fontSize: SIZES.body, color: COLORS.textDim, textAlign: 'center', marginTop: 5 },
  card:            { backgroundColor: COLORS.card, padding: SIZES.padding, borderRadius: SIZES.radius },
  formTitle:       { fontSize: SIZES.h2, color: COLORS.text, marginBottom: 20, fontWeight: '600', textAlign: 'center' },
  label:           { color: COLORS.textDim, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input:           { backgroundColor: COLORS.border, color: COLORS.text, padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  btnMain:         { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, width: '100%' },
  btnText:         { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
  switchBtn:       { marginTop: 20, alignItems: 'center' },
  link:            { color: COLORS.danger },
});
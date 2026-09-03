import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../types';
import ScreenWrapper from '../components/ScreenWrapper';
import { COLORS, SIZES } from '../constants/theme';

type DashboardProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: { navigation: DashboardProp }) {
  const { user, users, cases, loading, error } = useApp();

  // Show error alert if any
  React.useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // Admin Stats Calculation
  const allUsers = users || [];
  const investigatorCount = allUsers.filter(u => {
    const r = (u.role || '').toLowerCase();
    return r === 'investigator' || r === 'police';
  }).length;
  const forensicsCount = allUsers.filter(u => {
    const r = (u.role || '').toLowerCase();
    return r === 'forensics';
  }).length;

  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  const getStatusBadgeColor = (status?: string) => {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'CLOSED' || s === 'VERIFIED') return { bg: 'rgba(74, 222, 128, 0.2)', text: COLORS.success };
    if (s === 'UNDER_INVESTIGATION') return { bg: 'rgba(56, 189, 248, 0.2)', text: COLORS.primary };
    if (s === 'SUBMITTED_TO_COURT') return { bg: 'rgba(192, 132, 252, 0.2)', text: '#c084fc' };
    if (s === 'FROZEN') return { bg: 'rgba(239, 68, 68, 0.2)', text: COLORS.danger };
    return { bg: 'rgba(250, 204, 21, 0.2)', text: '#facc15' };
  };

  const renderHeader = () => (
    <View>
      {/* --- RESPONSIVE HEADER FIX --- */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.greeting}>
            Welcome, {user?.name}
          </Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase()} • TN POLICE</Text>
        </View>
        
        <TouchableOpacity onPress={() => navigation.replace('Auth')} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* --- ADMIN ONLY SECTION: USER STATS --- */}
      {isAdmin && (
        <View style={styles.adminStatsRow}>
          <View style={[styles.statCard, { backgroundColor: '#334155' }]}>
            <Ionicons name="people" size={20} color={COLORS.primary} style={{ marginBottom: 5 }} />
            <Text style={styles.statNum}>{investigatorCount}</Text>
            <Text style={styles.statLabel}>Officers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#334155' }]}>
            <Ionicons name="flask" size={20} color={COLORS.secondary} style={{ marginBottom: 5 }} />
            <Text style={styles.statNum}>{forensicsCount}</Text>
            <Text style={styles.statLabel}>Forensics</Text>
          </View>
        </View>
      )}

      {/* Stats Grid (General) */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{cases.length}</Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>
            {cases.filter(c => {
              const s = (c.status || '').toUpperCase();
              return s === 'OPEN' || s === 'UNDER_INVESTIGATION';
            }).length}
          </Text>
          <Text style={[styles.statLabel, { color: COLORS.primary }]}>Active</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cases Ledger</Text>
        {((user?.role || '').toLowerCase() === 'investigator' || (user?.role || '').toLowerCase() === 'police' || isAdmin) && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateCase')}>
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addBtnText}>New Case</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenWrapper style={{ paddingHorizontal: 0 }}> 
      <FlatList
        data={cases}
        keyExtractor={item => item.caseId}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          const badge = getStatusBadgeColor(item.status);
          const displayStatus = (item.status || 'OPEN').toString().replace(/_/g, ' ');
          return (
            <TouchableOpacity 
              style={styles.caseCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Evidence', { caseId: item.caseId })}
            >
              <View style={styles.caseHeader}>
                <Text style={styles.caseId}>{item.caseId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.statusText, { color: badge.text }]}>
                    {displayStatus}
                  </Text>
                </View>
              </View>
              <Text style={styles.caseTitle}>{item.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="person" size={12} color={COLORS.textDim} />
                  <Text style={styles.metaText}>{item.officer || 'Unassigned'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar" size={12} color={COLORS.textDim} />
                  <Text style={styles.metaText}>{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', // Centers button vertically if name wraps to 2 lines
    marginBottom: 24,
    width: '100%'
  },
  headerTextContainer: {
    flex: 1, // Takes all available space
    paddingRight: 15, // Adds buffer so text doesn't touch the button
  },
  greeting: { 
    fontSize: SIZES.h2, 
    fontWeight: 'bold', 
    color: COLORS.text,
    flexWrap: 'wrap', // Allows text to wrap to next line
  },
  userRole: { 
    color: COLORS.textDim, 
    fontSize: 12, 
    letterSpacing: 1, 
    marginTop: 4 
  },
  logoutBtn: { 
    flexShrink: 0, // Crucial: Prevents button from shrinking
    padding: 10, 
    backgroundColor: 'rgba(239, 68, 68, 0.15)', 
    borderRadius: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  adminStatsRow: { flexDirection: 'row', gap: 15, marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statCard: { flex: 1, backgroundColor: COLORS.card, padding: 20, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 2 },
  statLabel: { color: COLORS.textDim, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: SIZES.h3, fontWeight: '600', color: COLORS.text },
  addBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  addBtnText: { color: COLORS.background, fontWeight: 'bold', fontSize: 12, marginLeft: 6 },
  caseCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: SIZES.radius, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  caseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  caseId: { color: COLORS.textDim, fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  caseTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.textDim, fontSize: 12 }
});
import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  SafeAreaView, 
  StatusBar, 
  StyleSheet, 
  View, 
  StyleProp,
  ViewStyle 
} from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenWrapper({ children, style }: Props) {
  const content = (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {Platform.OS === 'web' ? (
        content
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {content}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    width: '100%',
    minHeight: '100%',
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
    width: '100%',
    minHeight: '100%',
  },
});
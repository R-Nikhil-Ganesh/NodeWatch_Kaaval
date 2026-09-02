// App.tsx
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppProvider } from './src/context/AppContext';
import { RootStackParamList } from './src/types';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreateCaseScreen from './src/screens/CreateCaseScreen';
import EvidenceScreen from './src/screens/EvidenceScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AppProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="CreateCase" component={CreateCaseScreen} />
            <Stack.Screen name="Evidence" component={EvidenceScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </AppProvider>
  );
}
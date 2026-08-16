import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import AddNoteScreen from './screens/AddNoteScreen';
import EditNoteScreen from './screens/EditNoteScreen';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { initializeNotifications } from './services/notificationService';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { theme } = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ route, navigation }) => ({
          header: ({ options }) => (
            <Header
              title={options.title}
              showBack={route.name !== 'Home'}
            />
          ),
          contentStyle: { backgroundColor: theme.background },
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'My Notes' }} />
        <Stack.Screen name="AddNote" component={AddNoteScreen} options={{ title: 'Add Note' }} />
        <Stack.Screen name="EditNote" component={EditNoteScreen} options={{ title: 'Edit Note' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initializeNotifications().catch(() => {
      // Intentionally ignored so the app remains usable without permissions.
    });
  }, []);

  return (
    <ThemeProvider>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <AppNavigator />
      )}
    </ThemeProvider>
  );
}


import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function ThemedApp() {
  const { colors, isDark } = useTheme();

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: 'transparent', // let the gradient backdrop show through
      card: colors.bgElevated,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <SafeAreaProvider>
      {/* Two-tone aqua → white backdrop, rendered once behind every screen. */}
      <LinearGradient
        colors={[colors.bgTop, colors.bgBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <NavigationContainer theme={navTheme}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgElevated} translucent={false} />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
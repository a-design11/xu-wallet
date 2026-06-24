import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { Ionicons } from '@expo/vector-icons';
import { SplashScreen } from 'expo-router';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WalletProvider } from '../context/WalletContext';
import { ThemeProvider } from '../mobile/theme/ThemeProvider';
import { AnimatedSplash } from '../components/AnimatedSplash';

// Keep the native splash screen up while we load fonts + JS bundle.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* older expo-router versions may not expose this */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    ...Ionicons.font,
  });

  // Control the custom animated splash visibility.
  // It shows as soon as fonts are loaded (native splash already gone),
  // then fades out when the animation completes.
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the native OS splash now that fonts are ready;
      // our custom AnimatedSplash takes over.
      SplashScreen.hideAsync().catch(() => {});
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  // Block render until fonts are available so there's no font-swap flicker.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <WalletProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0B0B0F' },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding/welcome" />
            <Stack.Screen name="onboarding/create" />
            <Stack.Screen name="onboarding/recovery" />
            <Stack.Screen name="onboarding/import" />
            <Stack.Screen name="onboarding/set-pin" />
            <Stack.Screen name="tabs" />
            <Stack.Screen name="dapp/[host]" />
            <Stack.Screen name="token/[id]" />
            <Stack.Screen name="receive/index" />
            <Stack.Screen name="send/index" />
            <Stack.Screen name="settings/networks" />
            <Stack.Screen name="settings/security" />
          </Stack>

          {/* Custom animated splash overlay — shown after fonts load, before user sees the app */}
          {appReady && showAnimatedSplash ? (
            <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} />
          ) : null}
        </WalletProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

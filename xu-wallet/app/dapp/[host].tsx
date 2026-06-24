// app/dapp/[host].tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, Pressable, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../mobile/theme/primitives/Text';
import { useTheme } from '../../mobile/theme/ThemeProvider';

export default function DAppView() {
  const { host, url } = useLocalSearchParams<{ host: string; url: string }>();
  const t = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const targetUrl = url || `https://${host}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.palette.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: t.palette.hairline,
          gap: 12,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={t.palette.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color="text" numberOfLines={1} style={{ fontWeight: '600' }}>
            {host}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {targetUrl}
          </Text>
        </View>
        <Pressable onPress={() => Share.share({ url: targetUrl })} hitSlop={10}>
          <Ionicons name="share-outline" size={20} color={t.palette.text} />
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={t.palette.text} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: targetUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={{ flex: 1, backgroundColor: t.palette.bg }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
        />
        {loading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: t.palette.rustox,
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
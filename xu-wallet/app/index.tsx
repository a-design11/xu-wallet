// app/index.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useWallet } from '../context/WalletContext';

export default function Index() {
  const { isWalletCreated, isLoading, isLocked } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isWalletCreated) {
      router.replace('/onboarding/welcome');
    } else if (isLocked) {
      // PIN unlock screen is part of set-pin with a `mode=unlock` flag.
      router.replace({ pathname: '/onboarding/set-pin', params: { mode: 'unlock' } });
    } else {
      router.replace('/tabs/home');
    }
  }, [isLoading, isWalletCreated, isLocked, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0F', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#F2613D" size="large" />
    </View>
  );
}
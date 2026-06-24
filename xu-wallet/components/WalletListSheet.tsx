// components/WalletListSheet.tsx
// Multi-wallet-group wallet list — slide-up modal.
// Each wallet group has its own seed phrase; BIP44 sub-accounts can be added
// under any group independently. Importing a new wallet creates a new group.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';
import { useWallet, Account, WalletGroup } from '../context/WalletContext';
import { isValidMnemonic } from '../mobile/services/accountService';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.92;

type Panel = 'list' | 'add-sub' | 'import';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Avatar helpers ────────────────────────────────────────────────────────────

function GroupAvatar({ group, size = 36 }: { group: WalletGroup; size?: number }) {
  const initials = group.name.slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: group.color + '33',
        borderWidth: 1.5,
        borderColor: group.color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontFamily: 'Manrope_700Bold', color: group.color }}>
        {initials}
      </Text>
    </View>
  );
}

function AccountAvatar({ account, size = 34 }: { account: Account; size?: number }) {
  const initials = account.name.slice(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: account.color + '22',
        borderWidth: 1,
        borderColor: account.color + '80',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.34, fontFamily: 'Manrope_700Bold', color: account.color }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Sub-account row ───────────────────────────────────────────────────────────

function SubAccountRow({
  account,
  isActive,
  onSelect,
  onLongPress,
}: {
  account: Account;
  isActive: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}) {
  const t = useTheme();
  const shortAddr = account.addresses.ethereum
    ? `${account.addresses.ethereum.slice(0, 6)}…${account.addresses.ethereum.slice(-4)}`
    : '';

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={onLongPress}
      delayLongPress={500}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 12,
        backgroundColor: isActive
          ? account.color + '10'
          : pressed
          ? t.palette.elevated
          : 'transparent',
        borderRadius: 10,
        marginHorizontal: 4,
        marginVertical: 1,
        borderWidth: isActive ? 1 : 0,
        borderColor: isActive ? account.color + '40' : 'transparent',
      })}
    >
      <AccountAvatar account={account} size={36} />

      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text
            style={{
              fontFamily: 'Manrope_600SemiBold',
              fontSize: 14,
              color: isActive ? account.color : t.palette.text,
            }}
            numberOfLines={1}
          >
            {account.name}
          </Text>
          <View
            style={{
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 4,
              backgroundColor: t.palette.evmSoft,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontFamily: 'InterTight_600SemiBold',
                color: t.palette.evm,
                letterSpacing: 0.5,
              }}
            >
              {`m/44'/60'/${account.accountIndex}'/0/0`}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, fontFamily: 'JetBrainsMono_400Regular', color: t.palette.textFaint }}>
          {shortAddr}
        </Text>
      </View>

      {isActive && (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: account.color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#0B0B0F', fontSize: 12, fontFamily: 'Manrope_700Bold' }}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Main Sheet ────────────────────────────────────────────────────────────────

export function WalletListSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const {
    walletGroups,
    accounts,
    activeAccount,
    switchAccount,
    addHdAccount,
    addWalletGroup,
    renameAccount,
    renameGroup,
    deleteAccount,
    deleteWalletGroup,
  } = useWallet();

  const slideY = useRef(new Animated.Value(SHEET_H)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<Panel>('list');
  // Which group the "add-sub" panel is targeting
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [targetGroupName, setTargetGroupName] = useState<string>('');

  // "add-sub" form
  const [subName, setSubName] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  // "import" form
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importName, setImportName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPanel('list');
      setSubName('');
      setSubError('');
      setImportMnemonic('');
      setImportName('');
      setImportError('');
      Animated.parallel([
        Animated.timing(slideY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: SHEET_H, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const close = useCallback(() => { onClose(); }, [onClose]);

  const handleSelectAccount = useCallback(async (id: string) => {
    if (id === activeAccount?.id) { close(); return; }
    await switchAccount(id);
    close();
  }, [activeAccount, switchAccount, close]);

  const openAddSub = useCallback((group: WalletGroup) => {
    const groupAccCount = accounts.filter((a) => a.walletGroupId === group.id).length;
    setTargetGroupId(group.id);
    setTargetGroupName(group.name);
    setSubName(`Account ${groupAccCount + 1}`);
    setSubError('');
    setPanel('add-sub');
  }, [accounts]);

  const handleAddSubAccount = useCallback(async () => {
    const name = subName.trim() || `Account ${accounts.filter((a) => a.walletGroupId === targetGroupId).length + 1}`;
    setSubLoading(true);
    setSubError('');
    try {
      await addHdAccount(name, targetGroupId);
      setPanel('list');
    } catch (e: any) {
      setSubError(e?.message ?? 'Failed to add account');
    } finally {
      setSubLoading(false);
    }
  }, [subName, accounts, targetGroupId, addHdAccount]);

  const handleImportWallet = useCallback(async () => {
    const phrase = importMnemonic.trim();
    const name = importName.trim() || `Wallet ${walletGroups.length + 1}`;
    if (!isValidMnemonic(phrase)) {
      setImportError('Invalid seed phrase. Must be 12 or 24 words.');
      return;
    }
    setImportLoading(true);
    setImportError('');
    try {
      await addWalletGroup(phrase, name);
      setPanel('list');
    } catch (e: any) {
      setImportError(e?.message ?? 'Failed to import wallet');
    } finally {
      setImportLoading(false);
    }
  }, [importMnemonic, importName, walletGroups.length, addWalletGroup]);

  const handleAccountLongPress = useCallback((account: Account) => {
    if (Platform.OS === 'web') {
      const choice = window.confirm(
        `Account: ${account.name}\n\nPress OK to rename, Cancel to delete.`
      );
      if (choice) {
        const newName = window.prompt('New name:', account.name);
        if (newName?.trim()) void renameAccount(account.id, newName.trim());
      } else if (accounts.length > 1) {
        if (window.confirm(`Delete "${account.name}"? Cannot be undone.`)) {
          void deleteAccount(account.id);
        }
      }
    } else {
      Alert.alert(account.name, 'Choose an action', [
        {
          text: 'Rename',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.prompt('Rename Account', '', (newName) => {
                if (newName?.trim()) void renameAccount(account.id, newName.trim());
              }, 'plain-text', account.name);
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (accounts.length <= 1) {
              Alert.alert('Cannot delete', 'Keep at least one account.');
              return;
            }
            Alert.alert('Delete account?', `"${account.name}" will be removed.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void deleteAccount(account.id) },
            ]);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [accounts.length, renameAccount, deleteAccount]);

  const handleGroupLongPress = useCallback((group: WalletGroup) => {
    if (Platform.OS === 'web') {
      const choice = window.confirm(
        `Wallet: ${group.name}\n\nPress OK to rename, Cancel to delete entire wallet group.`
      );
      if (choice) {
        const newName = window.prompt('New wallet name:', group.name);
        if (newName?.trim()) void renameGroup(group.id, newName.trim());
      } else if (walletGroups.length > 1) {
        if (window.confirm(`Delete wallet "${group.name}" and all its accounts? Cannot be undone.`)) {
          void deleteWalletGroup(group.id);
        }
      }
    } else {
      Alert.alert(group.name, 'Choose an action', [
        {
          text: 'Rename Wallet',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Alert.prompt('Rename Wallet', '', (newName) => {
                if (newName?.trim()) void renameGroup(group.id, newName.trim());
              }, 'plain-text', group.name);
            }
          },
        },
        {
          text: 'Delete Wallet',
          style: 'destructive',
          onPress: () => {
            if (walletGroups.length <= 1) {
              Alert.alert('Cannot delete', 'Keep at least one wallet.');
              return;
            }
            Alert.alert(
              'Delete wallet?',
              `Delete "${group.name}" and all its accounts? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => void deleteWalletGroup(group.id) },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [walletGroups.length, renameGroup, deleteWalletGroup]);

  if (!mounted) return null;

  const inputStyle = {
    backgroundColor: t.palette.elevated,
    borderWidth: 1,
    borderColor: t.palette.hairline,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: t.palette.text,
    fontFamily: 'InterTight_400Regular' as const,
    fontSize: 15,
    marginBottom: 12,
  };

  const primaryBtn = (label: string, onPress: () => void, loading: boolean, disabled?: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => ({
        backgroundColor: (loading || disabled) ? t.palette.hairline : t.palette.rustox,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center' as const,
        opacity: pressed ? 0.85 : 1,
        marginTop: 4,
      })}
    >
      <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 }}>
        {loading ? 'Please wait…' : label}
      </Text>
    </Pressable>
  );

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={close}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', opacity: overlayOpacity }} />
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={close} />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SHEET_H,
          backgroundColor: t.palette.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          transform: [{ translateY: slideY }],
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.palette.hairline }} />
        </View>

        {/* ── PANEL: WALLET GROUP LIST ───────────────────────── */}
        {panel === 'list' && (
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 20, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.palette.hairline,
            }}>
              <Text style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 17, color: t.palette.text }}>
                My Wallets
              </Text>
              <Pressable onPress={close} hitSlop={10}>
                <Text style={{ fontSize: 20, color: t.palette.textMuted }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              {walletGroups.map((group, gi) => {
                const groupAccounts = accounts.filter((a) => a.walletGroupId === group.id);
                return (
                  <View key={group.id} style={{ marginBottom: 4 }}>
                    {/* Group header */}
                    <Pressable
                      onLongPress={() => handleGroupLongPress(group)}
                      delayLongPress={600}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }}
                    >
                      <GroupAvatar group={group} size={32} />
                      <Text style={{ flex: 1, marginLeft: 10, fontFamily: 'Manrope_700Bold', fontSize: 14, color: t.palette.textMuted }}>
                        {group.name}
                      </Text>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: t.palette.rustoxSoft }}>
                        <Text style={{ fontSize: 9, fontFamily: 'InterTight_600SemiBold', color: t.palette.rustox, letterSpacing: 0.5 }}>
                          WALLET
                        </Text>
                      </View>
                    </Pressable>

                    {/* Sub-accounts */}
                    <View style={{ paddingLeft: 16 }}>
                      {groupAccounts.map((acc) => (
                        <SubAccountRow
                          key={acc.id}
                          account={acc}
                          isActive={activeAccount?.id === acc.id}
                          onSelect={() => void handleSelectAccount(acc.id)}
                          onLongPress={() => handleAccountLongPress(acc)}
                        />
                      ))}

                      {/* Add account under this group */}
                      <Pressable
                        onPress={() => openAddSub(group)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          marginHorizontal: 4,
                          marginTop: 2,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderStyle: 'dashed' as const,
                          borderColor: group.color + '50',
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 18, color: group.color, marginRight: 8, lineHeight: 22 }}>+</Text>
                        <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 13, color: group.color }}>
                          Add Account
                        </Text>
                        <Text style={{ marginLeft: 6, fontFamily: 'InterTight_400Regular', fontSize: 11, color: t.palette.textFaint }}>
                          (BIP44 sub-account)
                        </Text>
                      </Pressable>
                    </View>

                    {/* Divider between groups */}
                    {gi < walletGroups.length - 1 && (
                      <View style={{ height: 1, backgroundColor: t.palette.hairline, marginHorizontal: 20, marginTop: 12 }} />
                    )}
                  </View>
                );
              })}

              {/* Import Wallet = new group from different seed */}
              <Pressable
                onPress={() => { setImportMnemonic(''); setImportName(''); setImportError(''); setPanel('import'); }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 20,
                  marginTop: 16,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: t.palette.hairline,
                  backgroundColor: pressed ? t.palette.elevated : 'transparent',
                  gap: 8,
                })}
              >
                <Text style={{ fontSize: 18, color: t.palette.textMuted, lineHeight: 22 }}>⬇️</Text>
                <Text style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: t.palette.text }}>
                  Import Wallet
                </Text>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textFaint }}>
                  (new seed phrase)
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* ── PANEL: ADD BIP44 SUB-ACCOUNT ──────────────────── */}
        {panel === 'add-sub' && (
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 20, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.palette.hairline,
            }}>
              <Pressable onPress={() => setPanel('list')} hitSlop={10} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 18, color: t.palette.textMuted }}>←</Text>
              </Pressable>
              <Text style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 17, color: t.palette.text }}>
                Add Account
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
              {/* Context */}
              <View style={{ backgroundColor: t.palette.elevated, borderRadius: 12, padding: 16, marginBottom: 20, gap: 6 }}>
                <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 12, color: t.palette.textMuted }}>
                  UNDER WALLET
                </Text>
                <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 15, color: t.palette.text }}>
                  {targetGroupName}
                </Text>
                <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: t.palette.textFaint }}>
                  BIP44 derivation path: m/44'/60'/N'/0/0
                </Text>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 12, color: t.palette.textFaint }}>
                  The new account shares the same seed phrase but has a unique address.
                </Text>
              </View>

              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 13, color: t.palette.textMuted, marginBottom: 8 }}>
                Account Name
              </Text>
              <TextInput
                style={inputStyle}
                placeholder="e.g. Savings, DeFi, Trading"
                placeholderTextColor={t.palette.textFaint}
                value={subName}
                onChangeText={setSubName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleAddSubAccount}
              />

              {subError ? (
                <Text style={{ color: t.palette.danger, fontFamily: 'InterTight_400Regular', fontSize: 13, marginBottom: 12 }}>
                  {subError}
                </Text>
              ) : null}

              {primaryBtn('Create Account', handleAddSubAccount, subLoading)}
            </ScrollView>
          </View>
        )}

        {/* ── PANEL: IMPORT WALLET (new group) ──────────────── */}
        {panel === 'import' && (
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 20, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: t.palette.hairline,
            }}>
              <Pressable onPress={() => setPanel('list')} hitSlop={10} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 18, color: t.palette.textMuted }}>←</Text>
              </Pressable>
              <Text style={{ flex: 1, fontFamily: 'Manrope_700Bold', fontSize: 17, color: t.palette.text }}>
                Import Wallet
              </Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
              <View style={{ backgroundColor: t.palette.elevated, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <Text style={{ fontFamily: 'InterTight_400Regular', fontSize: 13, color: t.palette.textMuted, lineHeight: 20 }}>
                  Enter a different seed phrase to import it as a separate, isolated wallet.
                  You can then add BIP44 sub-accounts under it independently.
                </Text>
              </View>

              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 13, color: t.palette.textMuted, marginBottom: 8 }}>
                Seed Phrase (12 or 24 words)
              </Text>
              <TextInput
                style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]}
                placeholder="word1 word2 word3…"
                placeholderTextColor={t.palette.textFaint}
                value={importMnemonic}
                onChangeText={setImportMnemonic}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
              />

              <Text style={{ fontFamily: 'InterTight_500Medium', fontSize: 13, color: t.palette.textMuted, marginBottom: 8 }}>
                Wallet Name
              </Text>
              <TextInput
                style={inputStyle}
                placeholder={`Wallet ${walletGroups.length + 1}`}
                placeholderTextColor={t.palette.textFaint}
                value={importName}
                onChangeText={setImportName}
                autoCapitalize="words"
              />

              {importError ? (
                <Text style={{ color: t.palette.danger, fontFamily: 'InterTight_400Regular', fontSize: 13, marginBottom: 12 }}>
                  {importError}
                </Text>
              ) : null}

              {primaryBtn('Import Wallet', handleImportWallet, importLoading)}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

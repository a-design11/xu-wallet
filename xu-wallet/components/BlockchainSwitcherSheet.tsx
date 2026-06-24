// components/BlockchainSwitcherSheet.tsx
// Slide-up bottom sheet for switching blockchains and adding custom EVM chains.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../mobile/theme/primitives/Text';
import { useTheme } from '../mobile/theme/ThemeProvider';
import { CHAIN_META, Chain } from '../mobile/services/chainService';
import { CustomEvmChain, validateRpcUrl } from '../mobile/services/customChainService';
import { useWallet } from '../context/WalletContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Panel = 'list' | 'add';

const BUILT_IN_CHAINS: Chain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];

export function BlockchainSwitcherSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const {
    selectedBlockchain,
    setSelectedBlockchain,
    selectedCustomChain,
    setSelectedCustomChain,
    customChains,
    addCustomChain,
    removeCustomChain,
  } = useWallet();

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [panel, setPanel] = useState<Panel>('list');

  // Add chain form state
  const [form, setForm] = useState({
    chainId: '',
    name: '',
    symbol: '',
    rpcUrl: '',
    explorerUrl: '',
    decimals: '18',
  });
  const [formErr, setFormErr] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (visible) {
      setPanel('list');
      setForm({ chainId: '', name: '', symbol: '', rpcUrl: '', explorerUrl: '', decimals: '18' });
      setFormErr(null);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleSelectBuiltIn = useCallback(
    (chain: Chain) => {
      setSelectedBlockchain(chain);
      setSelectedCustomChain(null);
      onClose();
    },
    [setSelectedBlockchain, setSelectedCustomChain, onClose]
  );

  const handleSelectCustom = useCallback(
    (chain: CustomEvmChain) => {
      setSelectedCustomChain(chain);
      onClose();
    },
    [setSelectedCustomChain, onClose]
  );

  const handleRemoveCustom = useCallback(
    (id: string, name: string) => {
      Alert.alert('Remove network', `Remove "${name}" from your network list?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeCustomChain(id),
        },
      ]);
    },
    [removeCustomChain]
  );

  const handleAddChain = useCallback(async () => {
    setFormErr(null);
    const chainId = parseInt(form.chainId, 10);
    if (!form.name.trim()) { setFormErr('Network name is required.'); return; }
    if (!form.symbol.trim()) { setFormErr('Symbol is required.'); return; }
    if (!form.rpcUrl.trim() || !form.rpcUrl.startsWith('http')) {
      setFormErr('RPC URL must start with http:// or https://'); return;
    }
    if (!chainId || chainId <= 0) { setFormErr('Enter a valid Chain ID (positive integer).'); return; }
    const decimals = parseInt(form.decimals, 10);
    if (isNaN(decimals) || decimals < 0 || decimals > 36) {
      setFormErr('Decimals must be 0–36.'); return;
    }

    setIsValidating(true);
    try {
      const valid = await validateRpcUrl(form.rpcUrl.trim(), chainId);
      if (!valid) {
        setFormErr(`RPC did not report chain ID ${chainId}. Check the URL and Chain ID.`);
        setIsValidating(false);
        return;
      }
      await addCustomChain({
        chainId,
        name: form.name.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        rpcUrl: form.rpcUrl.trim(),
        explorerUrl: form.explorerUrl.trim(),
        decimals,
      });
      setPanel('list');
      setForm({ chainId: '', name: '', symbol: '', rpcUrl: '', explorerUrl: '', decimals: '18' });
    } catch (e: any) {
      setFormErr(e?.message ?? 'Failed to add network.');
    } finally {
      setIsValidating(false);
    }
  }, [form, addCustomChain]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* backdrop */}
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.65)',
            opacity: backdropAnim,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* sheet */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SHEET_HEIGHT,
            backgroundColor: t.palette.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            transform: [{ translateY: slideAnim }],
            overflow: 'hidden',
          }}
        >
          {/* drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: t.palette.hairline,
              }}
            />
          </View>

          {panel === 'list' ? (
            <ListPanel
              selectedBuiltIn={selectedBlockchain}
              selectedCustom={selectedCustomChain}
              customChains={customChains}
              onSelectBuiltIn={handleSelectBuiltIn}
              onSelectCustom={handleSelectCustom}
              onRemoveCustom={handleRemoveCustom}
              onAddChain={() => setPanel('add')}
              onClose={onClose}
            />
          ) : (
            <AddChainPanel
              form={form}
              setForm={setForm}
              formErr={formErr}
              isValidating={isValidating}
              onAdd={handleAddChain}
              onBack={() => { setPanel('list'); setFormErr(null); }}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── List Panel ─────────────────────────────────────────────────────────────

function ListPanel({
  selectedBuiltIn,
  selectedCustom,
  customChains,
  onSelectBuiltIn,
  onSelectCustom,
  onRemoveCustom,
  onAddChain,
  onClose,
}: {
  selectedBuiltIn: Chain;
  selectedCustom: CustomEvmChain | null;
  customChains: CustomEvmChain[];
  onSelectBuiltIn: (c: Chain) => void;
  onSelectCustom: (c: CustomEvmChain) => void;
  onRemoveCustom: (id: string, name: string) => void;
  onAddChain: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: t.palette.hairline,
        }}
      >
        <Text variant="subtitle" style={{ flex: 1 }}>Select Network</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={t.palette.textMuted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text variant="caption" color="textMuted" style={{ marginBottom: 10, letterSpacing: 1 }}>
          BUILT-IN NETWORKS
        </Text>
        {BUILT_IN_CHAINS.map((chain) => {
          const meta = CHAIN_META[chain];
          const active = selectedCustom === null && selectedBuiltIn === chain;
          return (
            <ChainRow
              key={chain}
              accent={meta.accent}
              name={meta.name}
              detail={meta.isEVM ? `EVM · Chain ID ${meta.chainId}` : `Chain ID —`}
              symbol={meta.symbol}
              active={active}
              onPress={() => onSelectBuiltIn(chain)}
            />
          );
        })}

        {customChains.length > 0 && (
          <>
            <Text
              variant="caption"
              color="textMuted"
              style={{ marginTop: 20, marginBottom: 10, letterSpacing: 1 }}
            >
              CUSTOM NETWORKS
            </Text>
            {customChains.map((chain) => {
              const active = selectedCustom?.id === chain.id;
              return (
                <ChainRow
                  key={chain.id}
                  accent={chain.accent}
                  name={chain.name}
                  detail={`EVM · Chain ID ${chain.chainId}`}
                  symbol={chain.symbol}
                  active={active}
                  onPress={() => onSelectCustom(chain)}
                  onLongPress={() => onRemoveCustom(chain.id, chain.name)}
                />
              );
            })}
          </>
        )}

        <Pressable
          onPress={onAddChain}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: '#F2613D40',
            borderStyle: 'dashed',
            backgroundColor: pressed ? '#F2613D10' : 'transparent',
          })}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#F2613D20',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={20} color="#F2613D" />
          </View>
          <View>
            <Text variant="bodyMedium" color="text">Add EVM Network</Text>
            <Text variant="caption" color="textMuted">Enter RPC details to add a custom chain</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#F2613D" style={{ marginLeft: 'auto' }} />
        </Pressable>

        <Text variant="caption" color="textFaint" style={{ textAlign: 'center', marginTop: 20 }}>
          Long-press a custom network to remove it
        </Text>
      </ScrollView>
    </>
  );
}

function ChainRow({
  accent,
  name,
  detail,
  symbol,
  active,
  onPress,
  onLongPress,
}: {
  accent: string;
  name: string;
  detail: string;
  symbol: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: active ? accent : t.palette.hairline,
        backgroundColor: active ? `${accent}14` : t.palette.bg,
        marginBottom: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${accent}25`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="bodyMedium" style={{ color: accent, fontSize: 11, fontWeight: '700' }}>
          {symbol.slice(0, 3)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color="text">{name}</Text>
        <Text variant="caption" color="textMuted">{detail}</Text>
      </View>
      {active && (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark" size={13} color="#000" />
        </View>
      )}
    </Pressable>
  );
}

// ─── Add Chain Panel ─────────────────────────────────────────────────────────

function AddChainPanel({
  form,
  setForm,
  formErr,
  isValidating,
  onAdd,
  onBack,
}: {
  form: {
    chainId: string;
    name: string;
    symbol: string;
    rpcUrl: string;
    explorerUrl: string;
    decimals: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  formErr: string | null;
  isValidating: boolean;
  onAdd: () => void;
  onBack: () => void;
}) {
  const t = useTheme();

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: t.palette.hairline,
        }}
      >
        <Pressable onPress={onBack} hitSlop={12} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={t.palette.text} />
        </Pressable>
        <Text variant="subtitle" style={{ flex: 1 }}>Add EVM Network</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="caption" color="textMuted" style={{ marginBottom: 16, lineHeight: 18 }}>
          Enter the details for your custom EVM-compatible network. The RPC URL will be validated
          against the Chain ID before saving.
        </Text>

        <FormField
          label="Network Name *"
          placeholder="e.g. Hardhat Local"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        />
        <FormField
          label="Chain ID *"
          placeholder="e.g. 31337"
          value={form.chainId}
          onChange={(v) => setForm((f) => ({ ...f, chainId: v.replace(/\D/g, '') }))}
          keyboardType="number-pad"
        />
        <FormField
          label="Currency Symbol *"
          placeholder="e.g. ETH"
          value={form.symbol}
          onChange={(v) => setForm((f) => ({ ...f, symbol: v.toUpperCase() }))}
          autoCapitalize="characters"
        />
        <FormField
          label="RPC URL *"
          placeholder="https://rpc.example.com"
          value={form.rpcUrl}
          onChange={(v) => setForm((f) => ({ ...f, rpcUrl: v }))}
          autoCapitalize="none"
          keyboardType="url"
        />
        <FormField
          label="Block Explorer URL"
          placeholder="https://explorer.example.com (optional)"
          value={form.explorerUrl}
          onChange={(v) => setForm((f) => ({ ...f, explorerUrl: v }))}
          autoCapitalize="none"
          keyboardType="url"
        />
        <FormField
          label="Currency Decimals"
          placeholder="18"
          value={form.decimals}
          onChange={(v) => setForm((f) => ({ ...f, decimals: v.replace(/\D/g, '') }))}
          keyboardType="number-pad"
        />

        {formErr ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              backgroundColor: `${t.palette.danger}18`,
              borderWidth: 1,
              borderColor: `${t.palette.danger}60`,
            }}
          >
            <Text variant="caption" style={{ color: t.palette.danger }}>{formErr}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={onAdd}
          disabled={isValidating}
          style={({ pressed }) => ({
            marginTop: 24,
            padding: 16,
            borderRadius: 14,
            backgroundColor: isValidating ? `${t.palette.rustox}80` : t.palette.rustox,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          {isValidating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
          )}
          <Text variant="bodyMedium" style={{ color: '#fff' }}>
            {isValidating ? 'Validating RPC…' : 'Add Network'}
          </Text>
        </Pressable>

        <Text variant="caption" color="textFaint" style={{ textAlign: 'center', marginTop: 16 }}>
          Your wallet address on EVM networks is always the same.{'\n'}
          RPC validation connects to the network to verify Chain ID.
        </Text>
      </ScrollView>
    </>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="caption" color="textMuted" style={{ marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.palette.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
        style={{
          backgroundColor: t.palette.bg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.palette.hairline,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: t.palette.text,
          fontFamily: 'InterTight_400Regular',
          fontSize: 15,
        }}
      />
    </View>
  );
}

const StyleSheet = {
  absoluteFillObject: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};

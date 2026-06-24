import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deriveAddresses,
  saveWalletToStorage,
  loadWalletFromStorage,
  clearWalletFromStorage,
  savePin,
  saveBiometricEnabled,
  getBiometricEnabled,
  saveApiKey,
  getApiKey,
  WalletAddresses,
} from '../mobile/services/walletService';
import {
  CHAIN_META,
  Chain,
  Network,
  getNativeBalance,
  getErc20Balance,
} from '../mobile/services/chainService';
import {
  getPrices,
  getTokenPriceByContract,
  setCoinGeckoApiKey,
  PriceInfo,
} from '../mobile/services/priceService';
import { tokenIdFor } from '../mobile/services/tokenRegistry';
import {
  CustomEvmChain,
  loadCustomChains,
  addCustomChain as addCustomChainToStorage,
  removeCustomChain as removeCustomChainFromStorage,
  getCustomChainBalance,
} from '../mobile/services/customChainService';
import {
  WalletGroup,
  Account,
  loadAllWalletData,
  setActiveAccountId,
  initFirstWalletGroup,
  addWalletGroup as addWalletGroupToStorage,
  addHdSubAccount as addHdSubAccountToStorage,
  renameAccount as renameAccountInStorage,
  renameGroup as renameGroupInStorage,
  deleteAccount as deleteAccountInStorage,
  deleteWalletGroup as deleteWalletGroupInStorage,
  clearAllAccounts,
} from '../mobile/services/accountService';

export type Blockchain = Chain;
export type { Network };
export type { Account, WalletGroup };

export interface Token {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  balanceUSD: number;
  change24h: number;
  contractAddress?: string;
  decimals?: number;
  logo?: string;
  blockchain: Blockchain;
  customChainId?: string;
}

export interface ImportedTokenRecord {
  chain: Chain;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  coingeckoId?: string;
}

interface WalletContextType {
  isWalletCreated: boolean;
  setIsWalletCreated: (value: boolean) => void;
  pin: string | null;
  setPin: (value: string) => Promise<void>;
  seedPhrase: string[];
  setSeedPhrase: (value: string[]) => void;
  selectedBlockchain: Blockchain;
  setSelectedBlockchain: (value: Blockchain) => void;
  selectedCustomChain: CustomEvmChain | null;
  setSelectedCustomChain: (value: CustomEvmChain | null) => void;
  customChains: CustomEvmChain[];
  addCustomChain: (params: Omit<CustomEvmChain, 'id' | 'accent'>) => Promise<void>;
  removeCustomChain: (id: string) => Promise<void>;
  network: Network;
  setNetwork: (value: Network) => Promise<void>;
  tokens: Token[];
  addToken: (token: Token) => void;
  importTokenRecord: (rec: ImportedTokenRecord) => Promise<void>;
  removeImportedToken: (chain: Chain, contractAddress: string) => Promise<void>;
  isTokenImported: (chain: Chain, contractAddress: string) => boolean;
  importedTokens: ImportedTokenRecord[];
  apiKeyEvm: string | null;
  apiKeySolana: string | null;
  apiKeyCoinGecko: string | null;
  setApiKey: (which: 'evm' | 'solana' | 'coinGecko', value: string | null) => Promise<void>;
  walletAddress: string;
  walletAddresses: WalletAddresses | null;
  initWallet: (mnemonic: string) => Promise<void>;
  isLoadingBalances: boolean;
  lastRefreshedAt: number | null;
  refreshBalances: () => Promise<void>;
  prices: Partial<Record<Blockchain, PriceInfo>>;
  biometricEnabled: boolean;
  setBiometricEnabled: (value: boolean) => Promise<void>;
  autoLockTimer: number;
  setAutoLockTimer: (value: number) => void;
  isLocked: boolean;
  setIsLocked: (value: boolean) => void;
  resetWallet: () => Promise<void>;
  isLoading: boolean;
  // ── Multi-wallet-group ─────────────────────────────────────────────────────
  walletGroups: WalletGroup[];
  activeGroup: WalletGroup | null;
  accounts: Account[];
  activeAccount: Account | null;
  switchAccount: (id: string) => Promise<void>;
  /** Add a BIP44 sub-account to a wallet group (defaults to active group). */
  addHdAccount: (name: string, groupId?: string) => Promise<void>;
  /** Import a new independent seed phrase as its own wallet group. */
  addWalletGroup: (mnemonic: string, name: string) => Promise<void>;
  renameAccount: (id: string, name: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  deleteWalletGroup: (id: string) => Promise<void>;
  getMasterMnemonic: () => Promise<string | null>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const CHAINS: Blockchain[] = ['rustox', 'ethereum', 'bnb', 'polygon', 'solana'];
const NETWORK_KEY = 'xu_wallet_network_v2';
const IMPORTED_TOKENS_KEY = 'xu_wallet_imported_tokens_v2';
const AUTO_LOCK_KEY = 'xu_wallet_auto_lock_v2';

function buildInitialTokens(): Token[] {
  return CHAINS.map((c) => {
    const m = CHAIN_META[c];
    return {
      id: tokenIdFor(c),
      name: m.name,
      symbol: m.symbol,
      balance: 0,
      balanceUSD: 0,
      change24h: 0,
      decimals: m.decimals,
      blockchain: c,
    };
  });
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isWalletCreated, setIsWalletCreated] = useState(false);
  const [pin, setPinState] = useState<string | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>('rustox');
  const [selectedCustomChain, setSelectedCustomChain] = useState<CustomEvmChain | null>(null);
  const [customChains, setCustomChains] = useState<CustomEvmChain[]>([]);
  const [network, setNetworkState] = useState<Network>('mainnet');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [importedTokens, setImportedTokens] = useState<ImportedTokenRecord[]>([]);
  const [walletAddresses, setWalletAddresses] = useState<WalletAddresses | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [prices, setPrices] = useState<Partial<Record<Blockchain, PriceInfo>>>({});
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [autoLockTimer, setAutoLockTimerState] = useState(5);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeyEvm, setApiKeyEvm] = useState<string | null>(null);
  const [apiKeySolana, setApiKeySolana] = useState<string | null>(null);
  const [apiKeyCoinGecko, setApiKeyCoinGecko] = useState<string | null>(null);
  // ── Multi-wallet-group state ───────────────────────────────────────────────
  const [walletGroups, setWalletGroups] = useState<WalletGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<WalletGroup | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const addressesRef = useRef<WalletAddresses | null>(null);
  const networkRef = useRef<Network>('mainnet');
  const importedRef = useRef<ImportedTokenRecord[]>([]);
  const customChainsRef = useRef<CustomEvmChain[]>([]);

  useEffect(() => { addressesRef.current = walletAddresses; }, [walletAddresses]);
  useEffect(() => { networkRef.current = network; }, [network]);
  useEffect(() => { importedRef.current = importedTokens; }, [importedTokens]);
  useEffect(() => { customChainsRef.current = customChains; }, [customChains]);

  const refreshBalances = useCallback(async () => {
    const addr = addressesRef.current;
    if (!addr) return;
    const currentNetwork = networkRef.current;
    const currentImported = importedRef.current;
    const currentCustom = customChainsRef.current;
    setIsLoadingBalances(true);
    try {
      setTokens((prev) =>
        (prev.length >= CHAINS.length ? prev : buildInitialTokens()).map((t) => ({
          ...t,
          balance: 0,
          balanceUSD: 0,
          change24h: 0,
        }))
      );
      const cgIds = CHAINS.map((c) => CHAIN_META[c].coingeckoId).filter(Boolean) as string[];
      const pricesById = await getPrices(cgIds).catch(() => ({} as Record<string, PriceInfo>));
      const priceByChain: Partial<Record<Blockchain, PriceInfo>> = {};
      for (const c of CHAINS) {
        const id = CHAIN_META[c].coingeckoId;
        if (id && pricesById[id]) priceByChain[c] = pricesById[id];
      }
      setPrices(priceByChain);

      const balances = await Promise.all(
        CHAINS.map((c) => getNativeBalance(c, addr[c], currentNetwork).catch(() => 0))
      );

      // Imported token balances — strictly per-chain.
      // Only the chain the token belongs to is queried; it never mixes chains.
      const importedResults = await Promise.all(
        currentImported.map(async (t) => {
          const holder = addr[t.chain] ?? '';
          let balance = 0;
          const isEvm = t.chain !== 'solana';
          if (isEvm && t.contractAddress) {
            balance = await getErc20Balance(
              t.chain, t.contractAddress, holder, t.decimals, currentNetwork
            ).catch(() => 0);
          }
          const price = await getTokenPriceByContract(t.chain, t.contractAddress).catch(() => null);
          return { rec: t, balance, price };
        })
      );

      const evmAddress = addr.ethereum ?? '';
      const customResults = await Promise.all(
        currentCustom.map(async (cc) => {
          const balance = evmAddress
            ? await getCustomChainBalance(cc.rpcUrl, cc.chainId, evmAddress).catch(() => 0)
            : 0;
          return { chain: cc, balance };
        })
      );

      setTokens(() => {
        const next = buildInitialTokens();
        CHAINS.forEach((c, i) => {
          const bal = balances[i] as number;
          const price = priceByChain[c]?.usd ?? 0;
          const change = priceByChain[c]?.change24h ?? 0;
          const slot = next.findIndex((t) => t.blockchain === c && !t.contractAddress && !t.customChainId);
          if (slot >= 0) {
            next[slot] = { ...next[slot], balance: bal, balanceUSD: bal * price, change24h: change };
          }
        });
        for (const r of importedResults) {
          const id = tokenIdFor(r.rec.chain, r.rec.contractAddress);
          const usd = r.price?.usd ?? 0;
          const ch = r.price?.change24h ?? 0;
          next.push({
            id, name: r.rec.name, symbol: r.rec.symbol,
            balance: r.balance, balanceUSD: r.balance * usd, change24h: ch,
            decimals: r.rec.decimals, contractAddress: r.rec.contractAddress,
            logo: r.rec.logoUrl, blockchain: r.rec.chain,
          });
        }
        for (const r of customResults) {
          next.push({
            id: `custom_token_${r.chain.id}`,
            name: r.chain.name, symbol: r.chain.symbol,
            balance: r.balance, balanceUSD: 0, change24h: 0,
            decimals: r.chain.decimals, blockchain: 'ethereum',
            customChainId: r.chain.id,
          });
        }
        return next;
      });
      setLastRefreshedAt(Date.now());
    } finally {
      setIsLoadingBalances(false);
    }
  }, []);

  const setNetwork = useCallback(async (value: Network) => {
    await AsyncStorage.setItem(NETWORK_KEY, value);
    setNetworkState(value);
    networkRef.current = value;
    if (addressesRef.current) void refreshBalances();
  }, [refreshBalances]);

  const setAutoLockTimer = useCallback((value: number) => {
    setAutoLockTimerState(value);
    AsyncStorage.setItem(AUTO_LOCK_KEY, String(value)).catch(() => null);
  }, []);

  const addCustomChain = useCallback(async (params: Omit<CustomEvmChain, 'id' | 'accent'>) => {
    const chain = await addCustomChainToStorage(params);
    setCustomChains((prev) => {
      const next = [...prev, chain];
      customChainsRef.current = next;
      return next;
    });
    if (addressesRef.current) void refreshBalances();
  }, [refreshBalances]);

  const removeCustomChain = useCallback(async (id: string) => {
    await removeCustomChainFromStorage(id);
    setCustomChains((prev) => {
      const next = prev.filter((c) => c.id !== id);
      customChainsRef.current = next;
      return next;
    });
    setSelectedCustomChain((prev) => (prev?.id === id ? null : prev));
    setTokens((prev) => prev.filter((t) => t.customChainId !== id));
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const [wallet, bio, storedNetwork, storedImported, cgKey, storedAutoLock, storedCustomChains] =
          await Promise.all([
            loadWalletFromStorage(),
            getBiometricEnabled(),
            AsyncStorage.getItem(NETWORK_KEY),
            AsyncStorage.getItem(IMPORTED_TOKENS_KEY),
            getApiKey('coinGecko'),
            AsyncStorage.getItem(AUTO_LOCK_KEY),
            loadCustomChains(),
          ]);

        setBiometricEnabledState(bio);
        const net: Network = storedNetwork === 'testnet' ? 'testnet' : 'mainnet';
        setNetworkState(net);
        networkRef.current = net;

        if (storedAutoLock) {
          const m = parseInt(storedAutoLock, 10);
          if (!Number.isNaN(m)) setAutoLockTimerState(m);
        }

        if (storedImported) {
          try {
            const parsed = JSON.parse(storedImported) as ImportedTokenRecord[];
            if (Array.isArray(parsed)) { setImportedTokens(parsed); importedRef.current = parsed; }
          } catch { /* ignore */ }
        }

        if (storedCustomChains.length > 0) {
          setCustomChains(storedCustomChains);
          customChainsRef.current = storedCustomChains;
        }

        if (cgKey) { setApiKeyCoinGecko(cgKey); setCoinGeckoApiKey(cgKey); }

        if (wallet.created && wallet.addresses) {
          setIsWalletCreated(true);
          if (wallet.mnemonic) setSeedPhrase(wallet.mnemonic.split(' '));
          setTokens(buildInitialTokens());
          setIsLocked(true);

          const { groups, accounts: accs, activeAccountId } = await loadAllWalletData(
            wallet.mnemonic,
            wallet.addresses,
          );

          setWalletGroups(groups);
          setAccounts(accs);

          const active = accs.find((a) => a.id === activeAccountId) ?? accs[0];
          if (active) {
            setActiveAccount(active);
            const grp = groups.find((g) => g.id === active.walletGroupId) ?? null;
            setActiveGroup(grp);
            setWalletAddresses(active.addresses);
            addressesRef.current = active.addresses;
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isWalletCreated || isLocked) return;
    refreshBalances();
  }, [isWalletCreated, isLocked, refreshBalances]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' && isWalletCreated && autoLockTimer > 0) {
        setIsLocked(true);
      } else if (state === 'active' && isWalletCreated) {
        setPinState(null);
      }
    });
    return () => sub.remove();
  }, [isWalletCreated, autoLockTimer]);

  const setPin = useCallback(async (value: string) => {
    await savePin(value);
    setPinState(value);
  }, []);

  const setBiometricEnabled = useCallback(async (value: boolean) => {
    await saveBiometricEnabled(value);
    setBiometricEnabledState(value);
  }, []);

  const setApiKey = useCallback(
    async (which: 'evm' | 'solana' | 'coinGecko', value: string | null) => {
      const v = (value ?? '').trim();
      await saveApiKey(which, v ? v : null);
      if (which === 'coinGecko') {
        setApiKeyCoinGecko(v || null);
        setCoinGeckoApiKey(v || undefined);
      } else if (which === 'solana') {
        setApiKeySolana(v || null);
      } else {
        setApiKeyEvm(v || null);
      }
      void refreshBalances();
    },
    [refreshBalances]
  );

  const walletAddress = selectedCustomChain
    ? (walletAddresses?.ethereum ?? '')
    : (walletAddresses ? walletAddresses[selectedBlockchain] ?? '' : '');

  // ── Onboarding: create the first wallet ───────────────────────────────────

  const initWallet = useCallback(async (mnemonic: string) => {
    const addresses = await deriveAddresses(mnemonic);
    await saveWalletToStorage(addresses, mnemonic);
    const { group, account } = await initFirstWalletGroup(mnemonic, addresses);
    setWalletGroups([group]);
    setAccounts([account]);
    setActiveGroup(group);
    setActiveAccount(account);
    setWalletAddresses(addresses);
    addressesRef.current = addresses;
    setSeedPhrase(mnemonic.split(' '));
    setTokens(buildInitialTokens());
    setIsWalletCreated(true);
    setIsLocked(false);
  }, []);

  // ── Multi-wallet-group actions ─────────────────────────────────────────────

  const switchAccount = useCallback(async (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (!target) return;
    await setActiveAccountId(id);
    const grp = walletGroups.find((g) => g.id === target.walletGroupId) ?? null;
    setActiveAccount(target);
    setActiveGroup(grp);
    setWalletAddresses(target.addresses);
    addressesRef.current = target.addresses;
    setTokens(buildInitialTokens());
    setLastRefreshedAt(null);
    void refreshBalances();
  }, [accounts, walletGroups, refreshBalances]);

  const getMasterMnemonic = useCallback(async (): Promise<string | null> => {
    const wallet = await loadWalletFromStorage();
    return wallet.mnemonic;
  }, []);

  const addHdAccount = useCallback(async (name: string, groupId?: string) => {
    const targetGroupId = groupId ?? activeAccount?.walletGroupId ?? 'group_0';
    const account = await addHdSubAccountToStorage(targetGroupId, name, accounts);
    setAccounts((prev) => [...prev, account]);
  }, [accounts, activeAccount]);

  const addWalletGroup = useCallback(async (mnemonic: string, name: string) => {
    const { group, account } = await addWalletGroupToStorage(mnemonic, name, walletGroups, accounts);
    setWalletGroups((prev) => [...prev, group]);
    setAccounts((prev) => [...prev, account]);
  }, [walletGroups, accounts]);

  const renameAccount = useCallback(async (id: string, name: string) => {
    const updated = await renameAccountInStorage(id, name, accounts);
    setAccounts(updated);
    setActiveAccount((prev) => prev?.id === id ? { ...prev, name } : prev);
  }, [accounts]);

  const renameGroup = useCallback(async (id: string, name: string) => {
    const updated = await renameGroupInStorage(id, name, walletGroups);
    setWalletGroups(updated);
    setActiveGroup((prev) => prev?.id === id ? { ...prev, name } : prev);
  }, [walletGroups]);

  const deleteAccount = useCallback(async (id: string) => {
    const updated = await deleteAccountInStorage(id, accounts);
    setAccounts(updated);
    if (activeAccount?.id === id && updated.length > 0) {
      await switchAccount(updated[0].id);
    }
  }, [accounts, activeAccount, switchAccount]);

  const deleteWalletGroup = useCallback(async (id: string) => {
    const { groups, accounts: newAccounts } = await deleteWalletGroupInStorage(id, walletGroups, accounts);
    setWalletGroups(groups);
    setAccounts(newAccounts);
    if (activeAccount?.walletGroupId === id && newAccounts.length > 0) {
      await switchAccount(newAccounts[0].id);
    }
  }, [walletGroups, accounts, activeAccount, switchAccount]);

  // ── Token operations ──────────────────────────────────────────────────────

  const addToken = useCallback((token: Token) => {
    setTokens((prev) => {
      if (prev.find((t) => t.id === token.id)) return prev;
      return [...prev, token];
    });
  }, []);

  const persistImported = useCallback(async (list: ImportedTokenRecord[]) => {
    await AsyncStorage.setItem(IMPORTED_TOKENS_KEY, JSON.stringify(list));
  }, []);

  const importTokenRecord = useCallback(async (rec: ImportedTokenRecord) => {
    const id = tokenIdFor(rec.chain, rec.contractAddress);
    setImportedTokens((prev) => {
      if (prev.find((t) => t.chain === rec.chain &&
          t.contractAddress.toLowerCase() === rec.contractAddress.toLowerCase())) return prev;
      const next = [...prev, rec];
      importedRef.current = next;
      void persistImported(next);
      return next;
    });
    setTokens((prev) => {
      if (prev.find((t) => t.id === id)) return prev;
      return [...prev, {
        id, name: rec.name, symbol: rec.symbol, balance: 0, balanceUSD: 0, change24h: 0,
        decimals: rec.decimals, contractAddress: rec.contractAddress,
        logo: rec.logoUrl, blockchain: rec.chain,
      }];
    });
    void refreshBalances();
  }, [persistImported, refreshBalances]);

  const removeImportedToken = useCallback(async (chain: Chain, contractAddress: string) => {
    const id = tokenIdFor(chain, contractAddress);
    setImportedTokens((prev) => {
      const next = prev.filter((t) => !(t.chain === chain &&
        t.contractAddress.toLowerCase() === contractAddress.toLowerCase()));
      importedRef.current = next;
      void persistImported(next);
      return next;
    });
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }, [persistImported]);

  const isTokenImported = useCallback(
    (chain: Chain, contractAddress: string) =>
      importedTokens.some((t) => t.chain === chain &&
        t.contractAddress.toLowerCase() === contractAddress.toLowerCase()),
    [importedTokens]
  );

  const resetWallet = useCallback(async () => {
    await clearWalletFromStorage();
    await clearAllAccounts();
    await AsyncStorage.multiRemove([IMPORTED_TOKENS_KEY]);
    setPinState(null);
    setSeedPhrase([]);
    setWalletAddresses(null);
    addressesRef.current = null;
    setTokens([]);
    setImportedTokens([]);
    importedRef.current = [];
    setIsWalletCreated(false);
    setBiometricEnabledState(false);
    setIsLocked(false);
    setPrices({});
    setLastRefreshedAt(null);
    setApiKeyEvm(null);
    setApiKeySolana(null);
    setApiKeyCoinGecko(null);
    setSelectedCustomChain(null);
    setWalletGroups([]);
    setAccounts([]);
    setActiveAccount(null);
    setActiveGroup(null);
    try {
      const { clearAttempts } = await import('../mobile/security/pinAttempts');
      await clearAttempts();
    } catch { /* ignore */ }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isWalletCreated, setIsWalletCreated,
        pin, setPin,
        seedPhrase, setSeedPhrase,
        selectedBlockchain, setSelectedBlockchain,
        selectedCustomChain, setSelectedCustomChain,
        customChains, addCustomChain, removeCustomChain,
        network, setNetwork,
        tokens, addToken, importTokenRecord, removeImportedToken, isTokenImported, importedTokens,
        apiKeyEvm, apiKeySolana, apiKeyCoinGecko, setApiKey,
        walletAddress, walletAddresses,
        initWallet,
        isLoadingBalances, lastRefreshedAt, refreshBalances,
        prices,
        biometricEnabled, setBiometricEnabled,
        autoLockTimer, setAutoLockTimer,
        isLocked, setIsLocked,
        resetWallet, isLoading,
        walletGroups, activeGroup,
        accounts, activeAccount,
        switchAccount, addHdAccount, addWalletGroup,
        renameAccount, renameGroup, deleteAccount, deleteWalletGroup,
        getMasterMnemonic,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

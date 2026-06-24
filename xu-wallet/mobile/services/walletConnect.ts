// mobile/services/walletConnect.ts
// WalletConnect v2 relay client shim. Heavy lifting would use @walletconnect/web3wallet.
// Phase 1 ships the relay URL and project-id wiring; full session mgmt in Phase 2.

export const WC_RELAY_URL = 'wss://relay.walletconnect.org';
export function getProjectId(): string {
  return (process.env.EXPO_PUBLIC_WC_PROJECT_ID ?? '').trim();
}
export function isConfigured(): boolean {
  return getProjectId().length > 0;
}
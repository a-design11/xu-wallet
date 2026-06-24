# UI/UX Redesign Plan — XU × RustOx v2

## 1. Aesthetic direction — "Editorial Crypto"

- **Voice:** confident, technical, never precious. Big numbers, real information.
- **Mood:** dark-first, high-contrast neutral, rust-orange *RustOx* accent,
  electric violet for EVM, mint for Solana.
- **Anti-patterns:** no purple-gradient-on-white, no emoji-as-icon,
  no card-of-cards.

## 2. Color system (tokens)

| Token                 | Value      | Usage                          |
|-----------------------|------------|--------------------------------|
| `bg.base`             | `#0B0B0F`  | App background                 |
| `bg.surface`          | `#15151C`  | Cards, sheets                  |
| `bg.elevated`         | `#1E1E27`  | Modal, dropdown                |
| `border.subtle`       | `#27272F`  | Hairlines                      |
| `text.primary`        | `#F4F4F6`  | Body                           |
| `text.secondary`      | `#9B9BA8`  | Subtitle                       |
| `text.tertiary`       | `#6B6B78`  | Caption                        |
| `accent.rustox`       | `#F2613D`  | RustOx primary                 |
| `accent.rustox.soft`  | `#3A1A12`  | RustOx tint background         |
| `accent.evm`          | `#7A5CFF`  | EVM primary                    |
| `accent.solana`       | `#3DDC97`  | Solana primary                 |
| `success`             | `#3DDC97`  |                               |
| `warning`             | `#F2B23D`  |                               |
| `danger`              | `#E5484D`  |                               |

## 3. Typography

- Display: **Manrope** 700 (titles, hero numbers)
- Body: **Inter Tight** 400/500/600
- Mono: **JetBrains Mono** (addresses, hashes, calldata)

Load via `expo-font`. Fallback chain kept robust on Android.

## 4. Motion

- Default easing: `cubic-bezier(.2,.8,.2,1)`, 250 ms.
- Spring: `damping 18, stiffness 200`.
- Hero load: staggered reveal ≤ 600 ms.
- Tab transition: shared-element on token icon (Phase 2).

## 5. Information architecture (mobile)

```
Splash
└─ Welcome (carousel)
   └─ Create | Import | Watch
      └─ Set PIN → Biometric
         └─ Backup recovery (quiz)
            └─ Tabs
               ├─ Home (portfolio)
               │   ├─ Send
               │   ├─ Receive
               │   ├─ Swap
               │   └─ Token detail
               ├─ Swap
               ├─ Browser
               │   └─ dApp view
               └─ Settings
                   ├─ Security
                   ├─ Networks
                   ├─ Connected sites
                   └─ About
```

## 6. Home screen composition

```
┌──────────────────────────────────────┐
│ ⌂  XU                          ⚙︎   │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │ Total balance        [👁 hide]   │ │
│ │ $12,348.21          ▲ +2.4% 24h  │ │
│ │ ──── sparkline ─────────────────  │ │
│ │ [Send] [Receive] [Swap] [Buy]    │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ RustOx · EVM · Solana                │
│ ─────────────────────────────────── │
│ ROX   1,200.45  $842  ▲1.1%   ⇄    │
│ ETH     0.42    $1.5k ▼0.4%   ⇄    │
│ SOL    12.1     $1.1k ▲3.2%   ⇄    │
│ USDC  300.00    $300  —       ⇄    │
│                                      │
│ [ Tab bar ]                          │
└──────────────────────────────────────┘
```

## 7. Component inventory

| Component           | Spec                                                        |
|---------------------|-------------------------------------------------------------|
| `PinInput`          | 6-dot, large-press keypad, shake on error                   |
| `TokenRow`          | Logo · symbol · balance · USD · 24h · chevron               |
| `BalanceCard`       | Hero total, sparkline, quick actions                        |
| `ChainChip`         | Pill with accent dot                                         |
| `ActionButton`      | Primary / secondary / ghost variants                         |
| `Sheet`             | Bottom sheet with drag handle                                |
| `Toast`             | Top-anchored, auto-dismiss                                   |
| `SegmentedControl`  | EVM / Solana / RustOx                                        |
| `AddressDisplay`    | Truncated address + copy, full on long-press                 |
| `QRReceive`         | QR with logo center, address, share button                  |
| `NetworkBadge`      | Color-coded chain indicator                                  |

## 8. Accessibility

- All interactive elements ≥ 48 × 48 dp.
- Color contrast ≥ 4.5:1 against `bg.surface`.
- `accessibilityLabel` set for every icon-only button.
- Dynamic-Type respected on every text style.

## 9. Anti-pattern checklist

- ❌ "Powered by React Native" splash logo with gradient bloom.
- ❌ Purple/violet gradient on white background.
- ❌ Emoji icons in tab bar.
- ❌ Modal stacked on modal.
- ❌ Placeholder Lorem text in production builds.

## 10. Release visuals

- Dark theme first; light theme in Phase 2.
- Brand mark: geometric **X** set inside a **bull horn** silhouette for
  RustOx; pure typographic **XU** for the wallet.
- Marketing screenshots generated from production builds, never mocks.
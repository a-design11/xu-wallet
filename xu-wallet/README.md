# XU Wallet

Non-custodial multi-chain Android crypto wallet. Built on Expo / React Native, compiled to an APK using **JDK 17 + Gradle**. No Vite / web build targets in this repo.

## Stack

- React Native 0.83 + Expo SDK 55 (router, secure-store, local-authentication, haptics).
- TypeScript, ethers v6, @noble/ed25519 (Solana).
- Native build: Gradle 9 + AGP + Android SDK 36 + NDK 27.1.
- Chains: Ethereum, BNB Chain, Polygon (EVM via ethers), Solana (native signer).

## Requirements

- **JDK 17** (Temurin or OpenJDK).
- **Node.js ≥ 20**.
- **Android SDK** with `platforms;android-36`, `build-tools;36.0.0`, `ndk;27.1.12297006`.

Environment:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
```

## Build

### Dev preview (recommended while iterating on UI)

Install **Expo Go** from the Play Store on the device you want to test on,
then on your dev machine:

```bash
npm install
npm run start        # prints a QR code in the terminal
```

Open Expo Go → "Scan QR code" → point at the terminal. Every save in `app/`,
`components/`, `mobile/` hot-reloads in ~1 s. **No APK rebuild needed.**

If your phone and dev machine aren't on the same LAN, use:

```bash
npm run start:tunnel   # routes through a public tunnel (slower but always works)
```

For an Android emulator instead of a real device:

```bash
npm run start:android
```

### Production APK

```bash
npm ci
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew :app:assembleDebug)
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

Release:

```bash
(cd android && ./gradlew :app:assembleRelease)
```

The CI workflow at `.github/workflows/build-apk.yml` produces signed release
APKs as workflow artifacts. Replace `android/app/debug.keystore` with your
own release keystore before shipping to the Play Store.

## Project layout

```
app/                 # expo-router screens (tabs, onboarding, send, receive, …)
components/          # reusable screen-level components
context/             # WalletContext (global state, secure storage, auto-lock)
mobile/services/     # chain + price services (ethers, CoinGecko, Binance)
mobile/theme/        # design tokens + primitives (added in Phase 1)
android/             # RN prebuilt Gradle project
```

## Roadmap

- Phase 0 – baseline APK build + CI (this PR).
- Phase 1 – design-system foundation (theme, typography, primitives, fonts).
- Phase 2 – industrial-grade UI polish (home / assets / nav / send / receive / settings).
- Phase 3 – interactive price charts (range selector + crosshair).
- Phase 4 – swap: PancakeSwap SDK (BNB) + Uniswap SDK (ETH/Polygon).
- Phase 5 – perf + a11y + release APK + demo recording.

See `FEATURES.md`, `PROJECT_OVERVIEW.md`, and `USER_GUIDE.md` for product context.

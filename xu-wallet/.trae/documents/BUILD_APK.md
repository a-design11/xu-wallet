# Build & Release — APK Pipeline

This repo ships **two build paths** to a signed `.apk`:

1. **Local Gradle** (fastest, dev / CI nightly).
2. **EAS Build** (cloud, reproducible, used for store submissions).

---

## 0. Prerequisites — Java 25 Optimization

For the fastest build performance in the Trae environment, we use **Java 25** for the Gradle daemon while maintaining **Java 17** compatibility for the compiler tasks.

| Tool         | Recommended Version        |
|--------------|----------------------------|
| Node         | ≥ 20                       |
| **JDK**      | **25 (Daemon)** / 17 (AGP) |
| Android SDK  | 36.0.0                     |

```bash
# Recommended environment variables for Trae
export JAVA_HOME=/root/.local/share/mise/installs/java/25.0.2
export ANDROID_HOME="/opt/android-sdk"
```

---

## 1. Install dependencies

```bash
npm ci
```

Populate `.env` from `.env.example`. Empty values are OK — the wallet falls
back to public free endpoints when keys are missing.

---

## 2. Local debug APK

```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew :app:assembleDebug)
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. Local release APK (signed)

1. **Generate a release keystore** (one time, store `.jks` + passwords in a
   password manager — never commit):

   ```bash
   keytool -genkey -v \
     -keystore release.xu.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias xu-wallet
   ```

2. **Configure Gradle** by creating `android/keystore.properties` (not
   committed):

   ```properties
   XU_UPLOAD_STORE_FILE=../../release.xu.jks
   XU_UPLOAD_KEY_ALIAS=xu-wallet
   XU_UPLOAD_STORE_PASSWORD=********
   XU_UPLOAD_KEY_PASSWORD=********
   ```

   Then ensure `android/app/build.gradle` reads these via `signingConfigs`.

3. **Build:**

   ```bash
   (cd android && ./gradlew :app:assembleRelease)
   # → android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 4. Cloud APK with EAS

EAS is already configured (`eas.projectId` in `app.json`):

```bash
npm i -g eas-cli
eas login
eas build --platform android --profile apk
```

`eas.json` (create one at repo root if missing):

```json
{
  "cli": { "version": ">= 13" },
  "build": {
    "apk": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "env": {
        "EXPO_PUBLIC_RUSTOX_RPC": "@string:rustox_rpc",
        "EXPO_PUBLIC_COINGECKO_API_KEY": "@string:coingecko_key"
      }
    }
  }
}
```

> Use `eas secret:create` for any non-public keys.

---

## 5. CI pipeline (GitHub Actions sketch)

```yaml
name: android-apk
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: |
          echo "sdk.dir=$ANDROID_HOME" > android/local.properties
          (cd android && ./gradlew :app:assembleRelease)
      - uses: actions/upload-artifact@v4
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
```

Secrets to register: `ANDROID_HOME` cache, `XU_UPLOAD_STORE_PASSWORD`,
`XU_UPLOAD_KEY_PASSWORD`, `EXPO_PUBLIC_*` for production RPCs.

---

## 6. Verifying an APK

```bash
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging \
  android/app/build/outputs/apk/release/app-release.apk | head
$ANDROID_HOME/build-tools/36.0.0/apksigner verify \
  --verbose android/app/build/outputs/apk/release/app-release.apk
```

Expected: `Verifies` and the SHA-256 fingerprint of your release key.
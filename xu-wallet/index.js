// Top-level crash capture. Any error thrown during polyfill loading or while
// evaluating expo-router / the app tree is kept here and rendered to the
// screen so the user can see what went wrong without needing adb logcat.
let __XU_STARTUP_ERR = null;
try {
  // Polyfills must run before everything else
  require('react-native-get-random-values');

  const { Buffer } = require('buffer');
  if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
  }

  // Configure @noble/ed25519 sha512 for React Native (crypto.subtle is not
  // available in RN). v3+ uses `ed.hashes.sha512` / `ed.hashes.sha512Async`.
  const { sha512 } = require('@noble/hashes/sha2');
  const ed = require('@noble/ed25519');
  if (ed.hashes) {
    ed.hashes.sha512 = sha512;
    ed.hashes.sha512Async = async (msg) => sha512(msg);
  }
  if (ed.etc) {
    ed.etc.sha512Sync = (msg) => sha512(msg);
    ed.etc.sha512Async = async (msg) => sha512(msg);
  }

  // Load the Expo Router entry point last. This is the module that calls
  // AppRegistry.registerComponent under the hood.
  require('expo-router/entry');
} catch (e) {
  __XU_STARTUP_ERR = e;
}

// Also catch any runtime errors that fire before React has mounted an
// ErrorBoundary. We hold onto the first fatal one so it can be shown in the
// fallback UI below.
try {
  const EU = (globalThis).ErrorUtils;
  if (EU && typeof EU.setGlobalHandler === 'function') {
    const prev = EU.getGlobalHandler ? EU.getGlobalHandler() : null;
    EU.setGlobalHandler(function (err, isFatal) {
      if (!__XU_STARTUP_ERR && isFatal) {
        __XU_STARTUP_ERR = err;
      }
      if (prev) {
        try { prev(err, isFatal); } catch (_) {}
      }
    });
  }
} catch (_) {}

// If anything went wrong above, replace the main component with a plain RN
// error screen so the user actually sees the message instead of a blank
// screen. This must not depend on expo-router (which may have been what
// failed), so we re-register "main" directly via AppRegistry.
if (__XU_STARTUP_ERR) {
  const React = require('react');
  const { AppRegistry, View, Text, ScrollView, StyleSheet } = require('react-native');
  const err = __XU_STARTUP_ERR;

  function StartupErrorScreen() {
    return React.createElement(
      View,
      { style: sErr.container },
      React.createElement(Text, { style: sErr.title }, 'XU Wallet failed to start'),
      React.createElement(
        ScrollView,
        { style: sErr.body },
        React.createElement(
          Text,
          { style: sErr.message, selectable: true },
          (err && err.message) ? String(err.message) : String(err)
        ),
        React.createElement(
          Text,
          { style: sErr.stack, selectable: true },
          (err && err.stack) ? String(err.stack) : '(no stack)'
        )
      ),
      React.createElement(
        Text,
        { style: sErr.hint },
        'Tap-and-hold to select the text above and share it with support.'
      )
    );
  }

  const sErr = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0E17', padding: 20, paddingTop: 60 },
    title: { color: '#FF4444', fontSize: 20, fontWeight: '800', marginBottom: 12 },
    body: { flex: 1, backgroundColor: '#000000AA', padding: 12, borderRadius: 8 },
    message: { color: '#FFFFFF', fontSize: 14, marginBottom: 12 },
    stack: { color: '#BBBBBB', fontSize: 11 },
    hint: { color: '#888888', fontSize: 11, marginTop: 12, textAlign: 'center' },
  });

  AppRegistry.registerComponent('main', function () {
    return StartupErrorScreen;
  });
}

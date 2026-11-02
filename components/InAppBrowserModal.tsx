import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Safely load WebView to prevent "Cannot read property 'WebView' of undefined" when native binary isn't rebuilt yet
let WebViewComponent: any = null;
try {
  const rnw = require('react-native-webview');
  WebViewComponent = rnw?.WebView || rnw?.default || rnw;
} catch (e) {
  WebViewComponent = null;
}

interface InAppBrowserModalProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  title?: string;
}

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({
  visible,
  url,
  onClose,
  title = 'เว็บไซต์เจริญไทย',
}) => {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const webViewRef = useRef<any>(null);

  // Normalize localhost for Android Emulator (10.0.2.2) vs Real Device
  const normalizedUrl =
    Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))
      ? url.replace(/localhost|127\.0\.0\.1/, '10.0.2.2')
      : url;

  // If WebView Native module is not in the current compiled APK, auto open URL on appear
  useEffect(() => {
    if (visible && !WebViewComponent) {
      Linking.openURL(normalizedUrl).catch(() => {});
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, normalizedUrl]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* 🧭 Vintage Teak & Gold Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.closeBtnText}>✕ ปิด</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text style={styles.siteTitleText} numberOfLines={1}>
              ❖ {title} ❖
            </Text>
          </View>

          <View style={styles.navActions}>
            <TouchableOpacity
              style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
              disabled={!canGoBack}
              onPress={() => webViewRef.current?.goBack?.()}
            >
              <Text style={styles.navBtnText}>❮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
              disabled={!canGoForward}
              onPress={() => webViewRef.current?.goForward?.()}
            >
              <Text style={styles.navBtnText}>❯</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => webViewRef.current?.reload?.()}
            >
              <Text style={styles.navBtnText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌐 WebView Body */}
        <View style={styles.webContainer}>
          {WebViewComponent ? (
            <WebViewComponent
              key={normalizedUrl}
              ref={webViewRef}
              source={{ uri: normalizedUrl }}
              style={styles.webView}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={(navState: any) => {
                setCanGoBack(navState?.canGoBack || false);
                setCanGoForward(navState?.canGoForward || false);
                if (navState?.url) setCurrentUrl(navState.url);
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              allowFileAccess={true}
              userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              allowsInlineMediaPlayback={true}
              originWhitelist={['*']}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#d4af37" />
                  <Text style={styles.loadingText}>กำลังโหลดหน้าเว็บไซต์...</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#d4af37" />
              <Text style={styles.loadingText}>กำลังเปิดหน้าเว็บไซต์...</Text>
            </View>
          )}

          {/* Top Loading Progress Bar */}
          {loading && WebViewComponent && (
            <View style={styles.loadingBar}>
              <ActivityIndicator size="small" color="#d4af37" />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#200f07',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b160e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#c29a4a',
  },
  closeBtn: {
    backgroundColor: '#8d1d1f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8c97e',
  },
  closeBtnText: {
    color: '#faeed6',
    fontSize: 11.5,
    fontWeight: '900',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#180b05',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    maxWidth: 180,
  },
  sslLock: {
    fontSize: 9,
    marginRight: 3,
  },
  siteTitleText: {
    color: '#faeed6',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    backgroundColor: '#3a1f13',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c29a4a',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: {
    color: '#faeed6',
    fontSize: 11,
    fontWeight: '900',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#fffdf7',
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#8d1d1f',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#200f07',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#d4af37',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 12,
  },
});

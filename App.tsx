import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Modal,
  StatusBar,
  Dimensions,
  Platform,
  Image,
  RefreshControl,
  Keyboard,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  checkLotteryWithGLO,
  LOTTERY_DRAWS_DATABASE,
  DEFAULT_LOTTERY_DATA,
  LotteryResult,
  CheckResult,
} from './services/lotteryApi';
import { InAppBrowserModal } from './components/InAppBrowserModal';
import {
  initFcm,
  onForegroundMessage,
  onTokenRefresh,
} from './services/fcm';

const { width } = Dimensions.get('window');

// 📜 Assets
const BG_IMAGE = require('./bac1cd8d-248c-497f-bcb9-2c1ac21656bd.png');
const STAMP_ICON = require('./ChatGPT Image 19 ส.ค. 2569 10_54_10.png');

// 🎋 SIAM SI FORTUNES DATABASE
const SIAM_SI_DATABASE = [
  { num: 1, title: 'ใบที่ ๑ : ก้าวแรกสู่ความสำเร็จ', desc: 'ดวงชะตาสว่างไสว อุปสรรคที่เคยมีจะคลี่คลาย การเงินและการงานมีเกณฑ์ได้รับข่าวดี เลขมงคลเด่น: 16, 168' },
  { num: 7, title: 'ใบที่ ๗ : มังกรผงาดฟ้า', desc: 'จะได้ลาภก้อนโตจากผู้หลักผู้ใหญ่หรือคนใกล้ชิด เดินทางแคล้วคลาดปลอดภัย เลขมงคลเด่น: 78, 789' },
  { num: 9, title: 'ใบที่ ๙ : มั่งคั่งร่ำรวย', desc: 'การเงินหมุนเวียนคล่องตัว โชคลาภกำลังเดินทางมาเยือนทิศบูรพา เลขมงคลเด่น: 09, 937' },
  { num: 12, title: 'ใบที่ ๑๒ : เทพารักษ์เกื้อหนุน', desc: 'สิ่งศักดิ์สิทธิ์คุ้มครอง คิดหวังสิ่งใดจะสำเร็จสมปรารถนา เลขมงคลเด่น: 12, 429' },
  { num: 18, title: 'ใบที่ ๑๘ : สมหวังดั่งใจปอง', desc: 'การค้าการลงทุนรุ่งเรือง มีลาภลอยจากการเสี่ยงโชค เลขมงคลเด่น: 18, 094' },
  { num: 24, title: 'ใบที่ ๒๔ : เศรษฐีใหม่', desc: 'หยิบจับสิ่งใดเป็นเงินเป็นทอง ดวงการเงินโดดเด่นสูงสุด เลขมงคลเด่น: 24, 731' },
  { num: 53, title: 'ใบที่ ๕๓ : มหาลาภพูนทวี', desc: 'โชคใหญ่กำลังมาตรงกับผลสลากงวดปัจจุบัน รับทรัพย์ถ้วนหน้า เลขมงคลเด่น: 53, 615' },
];

function MainScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<any>(null);

  // States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [toastText, setToastText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isFanOpen, setIsFanOpen] = useState(false);

  // Period / Draw Selector State (Default: งวดล่าสุด ๑๖ ส.ค. ๒๕๖๙)
  const [currentDrawIndex, setCurrentDrawIndex] = useState(0);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [activeGameTab, setActiveGameTab] = useState<'wheel' | 'siamsi' | 'egg' | 'water'>('wheel');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const lottery = LOTTERY_DRAWS_DATABASE[currentDrawIndex] || DEFAULT_LOTTERY_DATA;

  // Lottery Checking Input & State
  const [inputNumber, setInputNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Game Specific States
  const [siamsiResult, setSiamsiResult] = useState<typeof SIAM_SI_DATABASE[0] | null>(null);
  const [drawnEggs, setDrawnEggs] = useState<string[]>([]);
  const [waterDrops, setWaterDrops] = useState<string[]>([]);
  const [savedLuckyNumbers, setSavedLuckyNumbers] = useState<string[]>([]);

  // Layout Positions
  const [paperY, setPaperY] = useState(0);
  const [fortuneY, setFortuneY] = useState(0);
  const [archiveY, setArchiveY] = useState(0);

  // Animations
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const gameWheelRotation = useRef(new Animated.Value(0)).current;
  const currentWheelAngle = useRef(0);
  const currentGameWheelAngle = useRef(0);

  const cupShakeAnim = useRef(new Animated.Value(0)).current;
  const stick1Anim = useRef(new Animated.Value(0)).current;
  const stick2Anim = useRef(new Animated.Value(0)).current;
  const stick3Anim = useRef(new Animated.Value(0)).current;

  const fanAnim = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(20)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Card Scale Press Animations
  const paperScale = useRef(new Animated.Value(1)).current;
  const noteScale = useRef(new Animated.Value(1)).current;
  const ticketScale = useRef(new Animated.Value(1)).current;
  const webBtnBounceAnim = useRef(new Animated.Value(0)).current;

  // App Launch Disclaimer & Dynamic Website URL from Website API
  const PRODUCTION_HOST = 'https://charoen-thai.xyz';
  const [disclaimerVisible, setDisclaimerVisible] = useState(true);
  const [inAppWebModalVisible, setInAppWebModalVisible] = useState(false);
  const [serverWebsiteUrl, setServerWebsiteUrl] = useState(PRODUCTION_HOST);
  const [policyNotice, setPolicyNotice] = useState({
    title: '📜 ข้อตกลงและคำชี้แจงการใช้งาน',
    subTitle: 'มาตรฐานความปลอดภัย Google Play Developer Policy',
    message: 'แอปพลิเคชันนี้จัดทำขึ้นเพื่อเป็นเครื่องมืออรรถประโยชน์ในการตรวจผลสลากกินแบ่งรัฐบาล และเกมจำลองเสี่ยงทายเพื่อสาระความบันเทิงเท่านั้น\n\n• ❌ ไม่ใช่แอปพลิเคชันการพนัน (Not a Gambling App)\n• ❌ ไม่มีการซื้อ-ขาย หรือรับแทงสลากทุกประเภท\n• ❌ ไม่มีการฝาก-ถอน หรือการทำธุรกรรมเงินจริงใดๆ ทั้งสิ้น\n• 🏛️ แหล่งข้อมูลทางการ: อ้างอิงข้อมูลผลรางวัลจากเว็บไซต์ทางการของสำนักงานสลากกินแบ่งรัฐบาล (GLO): https://www.glo.or.th\n• ⚠️ ข้อความปฏิเสธความรับผิดชอบ: แอปพลิเคชันนี้ไม่ได้เป็นตัวแทนของหน่วยงานรัฐบาลใดๆ และไม่มีความเกี่ยวข้องหรือได้รับการรับรองจากสำนักงานสลากกินแบ่งรัฐบาล',
    confirmButtonText: 'รับทราบและเข้าสู่แอป ❯',
    websiteUrl: PRODUCTION_HOST,
    privacyUrl: `${PRODUCTION_HOST}/privacy`,
  });

  const toProductionUrl = (url?: string, fallbackPath = '') => {
    if (!url) return `${PRODUCTION_HOST}${fallbackPath}`;
    // Replace local/dev hosts with production domain
    if (
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('10.0.2.2') ||
      url.includes('192.168.')
    ) {
      try {
        const parsed = new URL(url);
        return `${PRODUCTION_HOST}${parsed.pathname === '/' ? fallbackPath || '/' : parsed.pathname}`;
      } catch {
        return `${PRODUCTION_HOST}${fallbackPath}`;
      }
    }
    return url;
  };

  const fetchLiveConfig = async () => {
    const path = '/api/app-config2';

    try {
      const res = await fetch(`${PRODUCTION_HOST}${path}?t=${Date.now()}`);
      if (!res.ok) return null;

      const data = await res.json();
      const websiteUrl = toProductionUrl(
        data?.websiteUrl || data?.policyNotice?.websiteUrl,
        '',
      );
      const privacyUrl = toProductionUrl(
        data?.privacyUrl || data?.policyNotice?.privacyUrl,
        '/privacy',
      );

      if (websiteUrl) {
        setServerWebsiteUrl(websiteUrl);
      }
      if (data?.policyNotice || websiteUrl || privacyUrl) {
        setPolicyNotice(prev => ({
          ...prev,
          ...(data?.policyNotice || {}),
          websiteUrl: websiteUrl || prev.websiteUrl,
          privacyUrl: privacyUrl || prev.privacyUrl,
        }));
      }
      return { ...data, websiteUrl, privacyUrl };
    } catch (err) {
      console.warn('[Config] fetch failed:', err);
      return null;
    }
  };

  const handleOpenWebsite = async () => {
    const data = await fetchLiveConfig();
    const url =
      data?.websiteUrl ||
      serverWebsiteUrl ||
      policyNotice.websiteUrl ||
      PRODUCTION_HOST;
    setServerWebsiteUrl(url);
    setInAppWebModalVisible(true);
  };

  const handleOpenPrivacy = async () => {
    const data = await fetchLiveConfig();
    const url =
      data?.privacyUrl ||
      policyNotice.privacyUrl ||
      `${PRODUCTION_HOST}/privacy`;
    setServerWebsiteUrl(url);
    setInAppWebModalVisible(true);
  };

  useEffect(() => {
    // Looping gentle bounce & pulse animation for the Visit Website button
    Animated.loop(
      Animated.sequence([
        Animated.timing(webBtnBounceAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(webBtnBounceAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (Platform.OS === 'android') {
      (StatusBar as any).setBackgroundColor?.('transparent', true);
      (StatusBar as any).setTranslucent?.(true);
    }

    // Fetch dynamic live config on launch
    fetchLiveConfig();
  }, []);

  const showToast = (text: string) => {
    setToastText(text);
    setToastVisible(true);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 20,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setToastVisible(false));
    }, 3200);
  };

  // FCM: request permission, get token, listen for messages
  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;
    let unsubscribeToken: (() => void) | undefined;

    initFcm().then(result => {
      if (result.token) {
        // TODO: ส่ง token ไปเซิร์ฟเวอร์เมื่อพร้อม
        console.log('[FCM] ready:', result.token.slice(0, 20) + '...');
      }
    });

    unsubscribeForeground = onForegroundMessage(remoteMessage => {
      const title = remoteMessage?.notification?.title || 'แจ้งเตือน';
      const body = remoteMessage?.notification?.body || '';
      showToast(body ? `${title}: ${body}` : title);
    });

    unsubscribeToken = onTokenRefresh(token => {
      console.log('[FCM] new token:', token.slice(0, 20) + '...');
    });

    return () => {
      unsubscribeForeground?.();
      unsubscribeToken?.();
    };
  }, []);

  const openSheet = (title: string, text: string) => {
    setModalTitle(title);
    setModalText(text);
    setModalVisible(true);
  };

  const addLuckyNumber = (num: string) => {
    if (!savedLuckyNumbers.includes(num)) {
      setSavedLuckyNumbers(prev => [num, ...prev].slice(0, 8));
    }
  };

  // Check user's 6-digit lottery number via official GLO API
  const handleCheckNumber = async (numToCheck?: string, targetDrawDate?: string) => {
    Keyboard.dismiss();
    const target = numToCheck || inputNumber;
    const clean = target.trim().replace(/\D/g, '');
    const dateToUse = targetDrawDate || lottery.rawDate;

    if (clean.length !== 6) {
      showToast('⚠️ กรุณากรอกหมายเลขสลากให้ครบ ๖ หลัก');
      return;
    }

    setIsChecking(true);
    showToast(`⏳ กำลังตรวจเลข [ ${clean} ] ผ่าน GLO API...`);

    try {
      const result = await checkLotteryWithGLO(clean, dateToUse);

      if (result.isWin) {
        const prizeListStr = result.prizesWon
          .map(p => `• ${p}`)
          .join('\n');
        
        openSheet(
          '🎉 ผลการตรวจ: ถูกรางวัล!',
          `หมายเลขสลาก: [ ${clean} ]\nงวดประจำวันที่: ${result.drawDate}\n\n🏆 รางวัลที่ได้รับ:\n${prizeListStr}\n\n💰 รวมเงินรางวัลประมาณการ: ฿${result.totalRewardEst.toLocaleString()} บาท\n\n🏛️ แหล่งข้อมูล: อ้างอิงจากเว็บไซต์ทางการสำนักงานสลากกินแบ่งรัฐบาล (GLO: https://www.glo.or.th)\n⚠️ หมายเหตุ: แอปนี้ไม่ใช่หน่วยงานรัฐบาล`
        );
        showToast(`🎉 ยินดีด้วย! ถูก ${result.prizesWon.join(', ')}`);
      } else {
        openSheet(
          '❌ ผลการตรวจสลากกินแบ่ง',
          `หมายเลขสลาก: [ ${clean} ]\nงวดประจำวันที่: ${result.drawDate}\n\nสถานะ: ไม่ถูกรางวัลในงวดนี้\n\n🏛️ แหล่งข้อมูล: อ้างอิงจากเว็บไซต์ทางการสำนักงานสลากกินแบ่งรัฐบาล (GLO: https://www.glo.or.th)\n⚠️ หมายเหตุ: แอปนี้ไม่ใช่หน่วยงานรัฐบาล`
        );
        showToast(`หมายเลข [ ${clean} ] ไม่ถูกรางวัลในงวดนี้`);
      }
    } catch (err) {
      console.log('GLO check error', err);
      showToast('ไม่สามารถเชื่อมต่อ GLO API ได้ในขณะนี้');
    } finally {
      setIsChecking(false);
    }
  };

  // Shake Siam Si Cup
  const handleFortunePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(cupShakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
        Animated.timing(cupShakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
        Animated.timing(cupShakeAnim, { toValue: 8, duration: 45, useNativeDriver: true }),
        Animated.timing(cupShakeAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
        Animated.timing(cupShakeAnim, { toValue: 4, duration: 45, useNativeDriver: true }),
        Animated.timing(cupShakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(stick1Anim, { toValue: -14, duration: 80, useNativeDriver: true }),
        Animated.timing(stick1Anim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(35),
        Animated.timing(stick2Anim, { toValue: -18, duration: 90, useNativeDriver: true }),
        Animated.timing(stick2Anim, { toValue: 0, duration: 110, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(65),
        Animated.timing(stick3Anim, { toValue: -15, duration: 90, useNativeDriver: true }),
        Animated.timing(stick3Anim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]).start();

    const picked = SIAM_SI_DATABASE[Math.floor(Math.random() * SIAM_SI_DATABASE.length)];
    setSiamsiResult(picked);
    addLuckyNumber(String(picked.num).padStart(2, '0'));
    showToast(`📜 เสี่ยงได้ ${picked.title}`);
  };

  // Spin Lucky Wheel (Main Screen)
  const handleSpinWheel = () => {
    const extraSpins = 1080 + Math.floor(Math.random() * 720);
    const newAngle = currentWheelAngle.current + extraSpins;
    currentWheelAngle.current = newAngle;

    showToast('🎡 กำลังหมุนวงล้อมงคล…');

    Animated.timing(wheelRotation, {
      toValue: newAngle,
      duration: 3000,
      easing: Easing.bezier(0.12, 0.88, 0.22, 1),
      useNativeDriver: true,
    }).start(() => {
      const luckyNums = [lottery.firstPrize, lottery.frontThree[0], lottery.backThree[0], lottery.backTwo, '๑๖๘', '๙๙', '๗๘๙', '๒๔'];
      const lucky = luckyNums[Math.floor(Math.random() * luckyNums.length)];
      addLuckyNumber(lucky);
      showToast(`✨ เลขมงคลที่ได้: [ ${lucky} ]`);
    });
  };

  // Spin Game Screen Big Wheel
  const handleSpinGameWheel = () => {
    const extraSpins = 1440 + Math.floor(Math.random() * 1080);
    const newAngle = currentGameWheelAngle.current + extraSpins;
    currentGameWheelAngle.current = newAngle;

    showToast('🎡 กำลังหมุนวงล้อมหาโชค…');

    Animated.timing(gameWheelRotation, {
      toValue: newAngle,
      duration: 3200,
      easing: Easing.bezier(0.12, 0.88, 0.22, 1),
      useNativeDriver: true,
    }).start(() => {
      const prizes = [
        { name: '๑๖๘ มั่งคั่ง', num: '168' },
        { name: '๙๙๙ เก้าหน้า', num: '999' },
        { name: '๗๘๙ มังกรเหิน', num: '789' },
        { name: '๕๓ ท้ายงวดนี้', num: '53' },
        { name: '๒๔ เศรษฐีใหม่', num: '24' },
        { name: '๘๘ เฮงทวีคูณ', num: '88' },
        { name: '๐๙ โชคลาภพูน', num: '09' },
        { name: '๖๑๕ รางวัลใหญ่', num: '615' },
      ];
      const win = prizes[Math.floor(Math.random() * prizes.length)];
      addLuckyNumber(win.num);
      showToast(`🎉 ยินดีด้วย! วงล้อหยุดที่ [ ${win.name} ] (${win.num})`);
    });
  };

  // Draw Ping Pong Egg
  const handleDrawEgg = () => {
    const random2D = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    setDrawnEggs(prev => [random2D, ...prev].slice(0, 6));
    addLuckyNumber(random2D);
    showToast(`🥚 ล้วงได้ไข่มังกรทองหมายเลข [ ${random2D} ]`);
  };

  // Holy Water Wax Divination
  const handleDropWax = () => {
    const waxNumbers = ['๙', '๓', '๗', '๕', '๘', '๒', '๑', '๖'];
    const chosen = [
      waxNumbers[Math.floor(Math.random() * waxNumbers.length)],
      waxNumbers[Math.floor(Math.random() * waxNumbers.length)],
      waxNumbers[Math.floor(Math.random() * waxNumbers.length)],
    ].join('');
    setWaterDrops(prev => [chosen, ...prev].slice(0, 4));
    addLuckyNumber(chosen);
    showToast(`🕯️ หยดน้ำตาเทียนมงคลรวมตัวเป็นเลข [ ${chosen} ]`);
  };

  const toggleFan = () => {
    const toVal = isFanOpen ? 0 : 1;
    setIsFanOpen(!isFanOpen);
    Animated.spring(fanAnim, {
      toValue: toVal,
      friction: 6,
      tension: 45,
      useNativeDriver: true,
    }).start();
  };

  const scrollToTarget = (yPos: number) => {
    scrollViewRef.current?.scrollTo({ y: Math.max(0, yPos - 16), animated: true });
    toggleFan();
  };

  const spinInterpolate = wheelRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const gameSpinInterpolate = gameWheelRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const webBtnTranslateY = webBtnBounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -3.5, 0],
  });
  const webBtnScale = webBtnBounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.025, 1],
  });

  // Filtered historical list
  const filteredHistory = LOTTERY_DRAWS_DATABASE.filter(item => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.trim();
    return (
      item.date.includes(q) ||
      item.firstPrize.includes(q) ||
      item.backTwo.includes(q) ||
      item.frontThree.some(n => n.includes(q)) ||
      item.backThree.some(n => n.includes(q))
    );
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* 🖼️ Vintage Background Wallpaper */}
      <Image
        source={BG_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      <View style={styles.imageOverlay} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 95,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => {
                setRefreshing(false);
                showToast(`✅ อัปเดตผลสลากงวด ${lottery.date} เรียบร้อย`);
              }, 400);
            }}
            tintColor="#8d1d1f"
            colors={['#8d1d1f', '#d4af37']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 🪧 Brand Header with Date Switcher */}
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <View style={styles.brandTitleRow}>
              <Image source={STAMP_ICON} style={styles.brandLogoMini} resizeMode="cover" />
              <View>
                <View style={styles.brandTaglineWrap}>
                  <View style={styles.goldDot} />
                  <Text style={styles.brandSub}>ตรวจผลสลาก • อ้างอิง GLO (glo.or.th)</Text>
                </View>
                <Text style={styles.brandTitle}>เจริญไทย หวยออนไลน์</Text>
              </View>
            </View>
          </View>

          {/* Date Picker Button (เลือกงวดได้) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setHistoryModalVisible(true)}
            style={styles.editionBadge}
          >
            <View style={styles.editionBadgeInner}>
              <Text style={styles.editionBadgeLabel}>คลังย้อนหลัง ▾</Text>
              <Text style={styles.editionText}>{lottery.date}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 🌟 PROMINENT BOUNCING VISIT WEBSITE VIP BANNER (ปุ่มเยี่ยมชมเว็บไซต์ เด่น เด้ง ชัดเจน) */}
        <Animated.View
          style={[
            styles.prominentWebBtnContainer,
            {
              transform: [
                { translateY: webBtnTranslateY },
                { scale: webBtnScale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenWebsite}
            style={styles.prominentWebBtn}
          >
            {/* Left Info with App Logo Icon */}
            <View style={styles.webBtnLeftWrap}>
              <View style={styles.webBtnIconCircle}>
                <Image source={STAMP_ICON} style={styles.webBtnAppLogo} resizeMode="cover" />
              </View>
              <View style={styles.webBtnTextWrap}>
                <View style={styles.webBtnTaglineRow}>
                  <View style={styles.pulsingGreenDot} />
                  <Text style={styles.webBtnTagline}>เปิดระบบ LIVE IN-APP WEBVIEW</Text>
                </View>
                <Text style={styles.webBtnMainTitle}>เยี่ยมชมเว็บไซต์ทางการ</Text>
              </View>
            </View>

            {/* Right Gold Pill Badge */}
            <View style={styles.webBtnActionBadge}>
              <Text style={styles.webBtnActionText}>เข้าชมเว็บ ❯</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* 🔍 GLO REAL-TIME LOTTERY CHECKER (ใช้งานได้จริง) */}
        <View style={styles.checkerCard}>
          <View style={styles.checkerHeader}>
            <View style={styles.checkerTitleRow}>
              <Text style={styles.checkerTitle}>🔍 ตรวจรางวัลสลากกินแบ่ง (GLO API)</Text>
            </View>
            <TouchableOpacity
              onPress={() => setHistoryModalVisible(true)}
              style={styles.checkerDatePill}
            >
              <Text style={styles.checkerSubtitle}>งวด {lottery.date} ▾</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkerInputRow}>
            <TextInput
              style={styles.checkerInput}
              placeholder="พิมพ์เลขสลาก ๖ หลัก"
              placeholderTextColor="#9b7e65"
              keyboardType="number-pad"
              maxLength={6}
              value={inputNumber}
              onChangeText={setInputNumber}
            />
            <TouchableOpacity
              style={styles.checkerBtn}
              activeOpacity={0.85}
              disabled={isChecking}
              onPress={() => handleCheckNumber()}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.checkerBtnText}>ตรวจรางวัล</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick test buttons for current draw */}
          <View style={styles.quickTestRow}>
            <Text style={styles.quickTestLabel}>ทดสอบเลขจริง:</Text>
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => {
                setInputNumber(lottery.firstPrize);
                handleCheckNumber(lottery.firstPrize);
              }}
            >
              <Text style={styles.quickPillText}>รางวัลที่ ๑ ({lottery.firstPrize})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickPill}
              onPress={() => {
                const sample2 = `0000${lottery.backTwo}`;
                setInputNumber(sample2);
                handleCheckNumber(sample2);
              }}
            >
              <Text style={styles.quickPillText}>เลขท้าย ๒ ตัว (..{lottery.backTwo})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 📰 1. REALISTIC NEWSPAPER (แสดงผลจริง) */}
        <Animated.View
          style={[
            styles.newspaperWrapper,
            {
              transform: [
                { rotate: '-1.2deg' },
                { scale: paperScale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.94}
            onPressIn={() => Animated.spring(paperScale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(paperScale, { toValue: 1, useNativeDriver: true }).start()}
            onLayout={(e) => setPaperY(e.nativeEvent.layout.y)}
            onPress={() => {
              const fullList = [
                `• รางวัลที่ ๑ : ${lottery.firstPrize} (๖,๐๐๐,๐๐๐ บาท)`,
                `• ข้างเคียงรางวัลที่ ๑ : ${(lottery.adjacentFirstPrize || []).join(', ')} (๑๐๐,๐๐๐ บาท)`,
                `• เลขหน้า ๓ ตัว : ${lottery.frontThree.join(', ')} (๔,๐๐๐ บาท)`,
                `• เลขท้าย ๓ ตัว : ${lottery.backThree.join(', ')} (๔,๐๐๐ บาท)`,
                `• เลขท้าย ๒ ตัว : ${lottery.backTwo} (๒,๐๐๐ บาท)`,
              ].join('\n');

              openSheet(
                '🗞️ ผลสลากกินแบ่งรัฐบาลฉบับเต็ม',
                `งวดประจำวันที่ ${lottery.date}\nแหล่งข้อมูลทางการ: สำนักงานสลากกินแบ่งรัฐบาล (GLO: https://www.glo.or.th)\n(แอปพลิเคชันนี้ไม่ได้เป็นตัวแทนของหน่วยงานรัฐบาล)\n\n${fullList}\n\nสามารถกรอกหมายเลข ๖ หลักที่ช่องตรวจด้านบนเพื่อตรวจผลได้ทันที!`
              );
            }}
            style={styles.newspaper}
          >
            <View style={styles.verticalFoldCrease} />
            <View style={styles.verticalFoldHighlight} />

            {/* Masthead Header */}
            <View style={styles.mast}>
              <View>
                <Text style={styles.mastName}>เจริญไทยรายวัน</Text>
                <Text style={styles.mastSubtitle}>ฉบับอ้างอิงผลรางวัล • สำนักงานสลากกินแบ่งรัฐบาล</Text>
              </View>
              <View style={styles.mastRightBox}>
                <TouchableOpacity
                  style={styles.stampBadgeMini}
                  onPress={() => setHistoryModalVisible(true)}
                >
                  <Text style={styles.stampBadgeMiniText}>
                    คลังย้อนหลัง 📜
                  </Text>
                </TouchableOpacity>
                <Text style={styles.mastDate}>งวด {lottery.date}{'\n'}GLO (glo.or.th)</Text>
              </View>
            </View>

            {/* Vintage Double Border */}
            <View style={styles.vintageDoubleBorder}>
              <View style={styles.vintageBorderLine} />
              <Text style={styles.vintageBorderIcon}>❖ ❖ ❖</Text>
              <View style={styles.vintageBorderLine} />
            </View>

            {/* Prize Section */}
            <View style={styles.prizeHeaderRow}>
              <View style={styles.prizeRibbon}>
                <Text style={styles.headline}>รางวัลที่หนึ่ง</Text>
              </View>
              <Text style={styles.prizeAmount}>เงินรางวัล ๖,๐๐๐,๐๐๐ บาท</Text>
            </View>

            {/* Big First Prize */}
            <View style={styles.firstPrizeContainer}>
              <Text style={styles.firstPrizeShadow}>{lottery.firstPrize}</Text>
              <Text style={styles.firstPrize}>{lottery.firstPrize}</Text>
            </View>

            {/* Sub-Prizes Columns */}
            <View style={styles.numbersBoxFrame}>
              <View style={styles.numbersGrid}>
                {/* หน้า 3 ตัว */}
                <View style={styles.numCol}>
                  <Text style={styles.numLabel}>หน้า ๓ ตัว</Text>
                  <View style={styles.numValueWrap}>
                    <Text style={styles.numValueSmall}>{lottery.frontThree[0]}</Text>
                    <Text style={styles.numValueSmall}>{lottery.frontThree[1]}</Text>
                  </View>
                </View>

                <View style={styles.colDivider} />

                {/* ท้าย 3 ตัว */}
                <View style={styles.numCol}>
                  <Text style={styles.numLabel}>ท้าย ๓ ตัว</Text>
                  <View style={styles.numValueWrap}>
                    <Text style={styles.numValueSmall}>{lottery.backThree[0]}</Text>
                    <Text style={styles.numValueSmall}>{lottery.backThree[1]}</Text>
                  </View>
                </View>

                <View style={styles.colDivider} />

                {/* ท้าย 2 ตัว */}
                <View style={[styles.numCol, styles.highlightCol]}>
                  <Text style={[styles.numLabel, { color: '#8d1d1f' }]}>ท้าย ๒ ตัว</Text>
                  <View style={[styles.numValueWrap, styles.highlightValueWrap]}>
                    <Text style={[styles.numValue, { color: '#8d1d1f', fontSize: 24 }]}>{lottery.backTwo}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Paper Corner Dog-Ear */}
            <View style={styles.paperCornerCurl} />
          </TouchableOpacity>
        </Animated.View>

        {/* 📌 2. SCATTER ROW: NOTE & SIAM SI CUP */}
        <View style={styles.scatter}>
          {/* Note Pad */}
          <Animated.View
            style={[
              styles.noteWrapper,
              {
                transform: [
                  { rotate: '2.5deg' },
                  { scale: noteScale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.93}
              onPressIn={() => Animated.spring(noteScale, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(noteScale, { toValue: 1, useNativeDriver: true }).start()}
              onPress={() =>
                openSheet(
                  '📝 สรุปตัวเลขเด่นประจำโต๊ะ',
                  `งวดประจำวันที่ ${lottery.date}:\n\n• เลขท้าย ๒ ตัว: ${lottery.backTwo}\n• เลขหน้า ๓ ตัว: ${lottery.frontThree.join(', ')}\n• เลขท้าย ๓ ตัว: ${lottery.backThree.join(', ')}\n• รางวัลที่ ๑: ${lottery.firstPrize}\n\nแตะช่องตรวจรางวัลด้านบนเพื่อตรวจสลากของคุณ!`
                )
              }
              style={styles.note}
            >
              <View style={styles.realisticTape} />

              <View style={styles.noteHeader}>
                <Text style={styles.scribble}>กระดาษจดบนโต๊ะ</Text>
                <Text style={styles.noteDateTag}>{lottery.date}</Text>
              </View>

              <View style={styles.noteBigNumberRow}>
                <Text style={styles.bigNumber}>{lottery.backTwo}</Text>
                <View style={styles.inkCircleStamp}>
                  <Text style={styles.inkCircleText}>ออก</Text>
                </View>
              </View>

              <View style={styles.noteBottomRow}>
                <Text style={styles.miniText}>
                  ตัวเลขจากผลล่าสุด{'\n'}
                  {lottery.frontThree[0]} · {lottery.frontThree[1]}
                </Text>
                <View style={styles.noteActionPill}>
                  <Text style={styles.noteActionPillText}>ดูสถิติ ❯</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* 🎋 Antique Bamboo Siam Si Cup (เซียมซีโบราณ) */}
          <View style={styles.cupWrapper}>
            <TouchableOpacity
              activeOpacity={0.9}
              onLayout={(e) => setFortuneY(e.nativeEvent.layout.y)}
              onPress={() => {
                handleFortunePress();
                // Optionally open game modal directly to Siam Si tab
                setActiveGameTab('siamsi');
                setGameModalVisible(true);
              }}
              style={styles.cupTouchArea}
            >
              {/* Antique Bamboo Sticks with Wood Grain */}
              <View style={styles.sticksContainer}>
                {/* Stick 1 */}
                <Animated.View
                  style={[
                    styles.bambooStick,
                    styles.stick1,
                    {
                      transform: [
                        { translateX: -24 },
                        { rotate: '-16deg' },
                        { translateY: stick1Anim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickGrainHighlight} />
                  <View style={styles.stickRedTip}><Text style={styles.stickNum}>๑๒</Text></View>
                </Animated.View>

                {/* Stick 2 */}
                <Animated.View
                  style={[
                    styles.bambooStick,
                    styles.stick2,
                    {
                      transform: [
                        { translateX: -14 },
                        { rotate: '-8deg' },
                        { translateY: stick2Anim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickGrainHighlight} />
                  <View style={styles.stickRedTip}><Text style={styles.stickNum}>๙</Text></View>
                </Animated.View>

                {/* Stick 3 */}
                <Animated.View
                  style={[
                    styles.bambooStick,
                    styles.stick3,
                    {
                      transform: [
                        { translateX: -3 },
                        { rotate: '-2deg' },
                        { translateY: stick3Anim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickGrainHighlight} />
                  <View style={styles.stickRedTip}><Text style={styles.stickNum}>๕๓</Text></View>
                </Animated.View>

                {/* Stick 4 */}
                <Animated.View
                  style={[
                    styles.bambooStick,
                    styles.stick4,
                    {
                      transform: [
                        { translateX: 7 },
                        { rotate: '6deg' },
                        { translateY: stick1Anim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickGrainHighlight} />
                  <View style={styles.stickRedTip}><Text style={styles.stickNum}>๒๔</Text></View>
                </Animated.View>

                {/* Stick 5 */}
                <Animated.View
                  style={[
                    styles.bambooStick,
                    styles.stick5,
                    {
                      transform: [
                        { translateX: 17 },
                        { rotate: '14deg' },
                        { translateY: stick2Anim },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickGrainHighlight} />
                  <View style={styles.stickRedTip}><Text style={styles.stickNum}>๑๘</Text></View>
                </Animated.View>

                {/* Stick 6 */}
                <Animated.View
                  style={[
                    styles.bambooStick,
                    styles.stick6,
                    {
                      transform: [
                        { translateX: 26 },
                        { rotate: '20deg' },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickGrainHighlight} />
                  <View style={styles.stickRedTip}><Text style={styles.stickNum}>๗</Text></View>
                </Animated.View>
              </View>

              {/* Antique Cup Barrel */}
              <Animated.View
                style={[
                  styles.cupBarrel,
                  { transform: [{ translateX: cupShakeAnim }] },
                ]}
              >
                {/* Antique Bamboo Slats Texture */}
                <View style={styles.woodSlatsOverlay}>
                  <View style={styles.woodSlatLine} />
                  <View style={styles.woodSlatLine} />
                  <View style={styles.woodSlatLine} />
                  <View style={styles.woodSlatLine} />
                  <View style={styles.woodSlatLine} />
                </View>

                {/* Top Antique Brass Band with Rivets */}
                <View style={styles.brassBandTop}>
                  <View style={styles.brassRivet} />
                  <View style={styles.brassRivet} />
                  <View style={styles.brassRivet} />
                  <View style={styles.brassRivet} />
                </View>

                <View style={styles.cylinderHighlight} />
                <View style={styles.cylinderShadow} />

                {/* ⛩️ Antique Cinnabar Lacquer Plaque */}
                <View style={styles.vintageTemplePlaque}>
                  <View style={styles.plaqueGoldBorder}>
                    <Text style={styles.plaqueHeaderDecor}>❖ 🎋 ❖</Text>
                    <Text style={styles.cupTitle}>เซียมซีวันนี้</Text>
                    <View style={styles.plaqueDivider} />
                    <Text style={styles.cupSubtitle}>แตะเปิดเสี่ยงทาย ❯</Text>
                  </View>
                </View>

                {/* Bottom Antique Brass Band with Rivets */}
                <View style={styles.brassBandBottom}>
                  <View style={styles.brassRivet} />
                  <View style={styles.brassRivet} />
                  <View style={styles.brassRivet} />
                  <View style={styles.brassRivet} />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🎟️ 3. TICKET STACK (คลังสลากย้อนหลัง) */}
        <Animated.View
          style={[
            styles.ticketStackWrapper,
            { transform: [{ scale: ticketScale }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.94}
            onPressIn={() => Animated.spring(ticketScale, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(ticketScale, { toValue: 1, useNativeDriver: true }).start()}
            onLayout={(e) => setArchiveY(e.nativeEvent.layout.y)}
            onPress={() => setHistoryModalVisible(true)}
            style={styles.ticketStack}
          >
            <View style={[styles.ticketLayer, styles.ticketLayer2]} />
            <View style={[styles.ticketLayer, styles.ticketLayerTop]}>
              <View style={styles.ticketStub}>
                <Text style={styles.stubSerial}>NO. ๑๖๘๙</Text>
                <View style={styles.stubBarcode}>
                  <View style={{ width: 2, height: 22, backgroundColor: '#5c4033', marginRight: 2 }} />
                  <View style={{ width: 1, height: 22, backgroundColor: '#5c4033', marginRight: 2 }} />
                  <View style={{ width: 3, height: 22, backgroundColor: '#5c4033', marginRight: 1 }} />
                  <View style={{ width: 1, height: 22, backgroundColor: '#5c4033' }} />
                </View>
                <Text style={styles.stubBatch}>ชุดที่ ๒๔</Text>
              </View>

              <View style={styles.perforationLine}>
                {[...Array(6)].map((_, i) => (
                  <View key={i} style={styles.perforationHole} />
                ))}
              </View>

              <View style={styles.ticketMainBody}>
                <View style={styles.ticketBadgeRow}>
                  <View style={styles.ticketTypeBadge}>
                    <Text style={styles.ticketTypeBadgeText}>คลังฉบับเก่า</Text>
                  </View>
                  <Text style={styles.ticketWatermarkText}>หอจดหมายเหตุ ({LOTTERY_DRAWS_DATABASE.length} งวด)</Text>
                </View>
                <Text style={styles.ticketMainTitle}>แตะเพื่อเปิดดูคลังผลสลากย้อนหลังทั้งหมด 🗄️</Text>
              </View>

              <View style={styles.ticketPillBadge}>
                <Text style={styles.ticketPillBadgeText}>เปิดดู ❯</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* 🎡 4. LUCKY WHEEL ZONE */}
        <View style={styles.wheelZone}>
          <View style={styles.wheelCopy}>
            <View style={styles.wheelTaglineWrap}>
              <Text style={styles.wheelTagline}>ลานละเล่นมงคล</Text>
            </View>
            <Text style={styles.wheelTitle}>วงล้อมงคล</Text>
            <Text style={styles.wheelDesc}>
              หมุนเพื่อสุ่มตัวเลขมงคลและคำทำนายลาภลอย
            </Text>

            <TouchableOpacity
              style={styles.spinButtonAction}
              activeOpacity={0.8}
              onPress={() => {
                setActiveGameTab('wheel');
                setGameModalVisible(true);
              }}
            >
              <Text style={styles.spinButtonText}>เข้าสู่ลานละเล่น 🎮</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSpinWheel}
            style={styles.wheelUnitContainer}
          >
            <View style={styles.brassPointerOuter}>
              <View style={styles.brassPointerTriangle} />
            </View>

            <View style={styles.brassBezelRing}>
              <Animated.View
                style={[
                  styles.wheelCore,
                  { transform: [{ rotate: spinInterpolate }] },
                ]}
              >
                <View style={[styles.wheelSector, { backgroundColor: '#8b1d20', top: 0, left: 0 }]} />
                <View style={[styles.wheelSector, { backgroundColor: '#d4af37', top: 0, right: 0 }]} />
                <View style={[styles.wheelSector, { backgroundColor: '#1e3f2b', bottom: 0, left: 0 }]} />
                <View style={[styles.wheelSector, { backgroundColor: '#e5ca85', bottom: 0, right: 0 }]} />

                <View style={[styles.wheelSectorDiagonal, { transform: [{ rotate: '45deg' }] }]}>
                  <View style={[styles.wheelSector, { backgroundColor: '#e5ca85', top: 0, left: 0 }]} />
                  <View style={[styles.wheelSector, { backgroundColor: '#8b1d20', top: 0, right: 0 }]} />
                  <View style={[styles.wheelSector, { backgroundColor: '#d4af37', bottom: 0, left: 0 }]} />
                  <View style={[styles.wheelSector, { backgroundColor: '#1e3f2b', bottom: 0, right: 0 }]} />
                </View>

                {/* Center Medallion with Emblazoned Stamp Icon */}
                <View style={styles.wheelCenterMedallion}>
                  <Image source={STAMP_ICON} style={styles.wheelCenterImage} resizeMode="cover" />
                </View>
              </Animated.View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 📜 Footer Note & Visit Website Button (Dynamic Link from API) */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.visitWebBtn}
            activeOpacity={0.85}
            onPress={handleOpenWebsite}
          >
            <Image source={STAMP_ICON} style={styles.visitWebBtnLogo} resizeMode="cover" />
            <Text style={styles.visitWebBtnText}>เยี่ยมชมเว็บไซต์ทางการ</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            แอปตัวอย่างนี้จัดทำเพื่อแสดงแนวคิด UI/UX เท่านั้น เกมเป็นการจำลองเพื่อความบันเทิง
            ไม่มีการเดิมพัน ฝาก–ถอน หรือแลกรางวัลเป็นเงินจริง
          </Text>
        </View>
      </ScrollView>

      {/* 🏮 Floating Fan Menu */}
      {isFanOpen && (
        <View style={[styles.fanContainer, { bottom: insets.bottom + 90 }]}>
          {/* Item 1: เยี่ยมชมเว็บ (Dynamic Link from API) */}
          <Animated.View
            style={[
              styles.fanItem,
              {
                opacity: fanAnim,
                transform: [
                  {
                    translateY: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -146],
                    }),
                  },
                  {
                    translateX: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -118],
                    }),
                  },
                  {
                    rotate: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-28deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.fanBtn, styles.fanBtnGold]}
              activeOpacity={0.8}
              onPress={() => {
                toggleFan();
                handleOpenWebsite();
              }}
            >
              <View style={styles.fanBtnLogoRow}>
                <Image source={STAMP_ICON} style={styles.fanBtnLogo} resizeMode="cover" />
                <Text style={[styles.fanBtnText, { color: '#8d1d1f' }]}>เว็บไซต์</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Item 2: ย้อนหลัง */}
          <Animated.View
            style={[
              styles.fanItem,
              {
                opacity: fanAnim,
                transform: [
                  {
                    translateY: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -108],
                    }),
                  },
                  {
                    translateX: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -82],
                    }),
                  },
                  {
                    rotate: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-20deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fanBtn}
              activeOpacity={0.8}
              onPress={() => {
                toggleFan();
                setHistoryModalVisible(true);
              }}
            >
              <Text style={styles.fanBtnText}>ย้อนหลัง</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Item 3: เกมมงคล */}
          <Animated.View
            style={[
              styles.fanItem,
              {
                opacity: fanAnim,
                transform: [
                  {
                    translateY: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -70],
                    }),
                  },
                  {
                    translateX: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -44],
                    }),
                  },
                  {
                    rotate: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-12deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fanBtn}
              activeOpacity={0.8}
              onPress={() => {
                toggleFan();
                setGameModalVisible(true);
              }}
            >
              <Text style={styles.fanBtnText}>เกมมงคล</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Item 4: ผลหวย */}
          <Animated.View
            style={[
              styles.fanItem,
              {
                opacity: fanAnim,
                transform: [
                  {
                    translateY: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -32],
                    }),
                  },
                  {
                    translateX: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -6],
                    }),
                  },
                  {
                    rotate: fanAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-4deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.fanBtn}
              activeOpacity={0.8}
              onPress={() => scrollToTarget(paperY)}
            >
              <Text style={styles.fanBtnText}>ผลหวย</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* 🔴 Realistic Floating Stamp Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggleFan}
        style={[
          styles.waxSealStampBtn,
          { bottom: insets.bottom + 18 },
          isFanOpen && styles.waxSealOpen,
        ]}
      >
        <Image
          source={STAMP_ICON}
          style={styles.stampImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* 🔔 Toast Notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 95,
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastText}</Text>
        </Animated.View>
      )}

      {/* 🎮 DEDICATED AUSPICIOUS GAME HUB MODAL (ลานละเล่นเจริญไทย) */}
      <Modal
        visible={gameModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setGameModalVisible(false)}
      >
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          {/* Background Wallpaper */}
          <Image
            source={BG_IMAGE}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />

          {/* Game Top Bar */}
          <View style={styles.gameHeaderBar}>
            <TouchableOpacity
              style={styles.historyBackBtn}
              activeOpacity={0.8}
              onPress={() => setGameModalVisible(false)}
            >
              <View style={styles.historyBackIconCircle}>
                <Text style={styles.historyBackIconGlyph}>❮</Text>
              </View>
              <Text style={styles.historyBackBtnText}>กลับสู่โต๊ะ</Text>
            </TouchableOpacity>

            <View style={styles.historyHeaderTitleBox}>
              <Text style={styles.historyMainTitle}>🎮 ลานละเล่นมงคล</Text>
              <Text style={styles.historySubTitle}>เสี่ยงทายโชคลาภ • เจริญไทย</Text>
            </View>
          </View>

          {/* Game Tab Switcher */}
          <View style={styles.gameTabRow}>
            <TouchableOpacity
              style={[styles.gameTabItem, activeGameTab === 'wheel' && styles.gameTabItemActive]}
              onPress={() => setActiveGameTab('wheel')}
            >
              <Text style={[styles.gameTabText, activeGameTab === 'wheel' && styles.gameTabTextActive]}>
                🎡 วงล้อโชค
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gameTabItem, activeGameTab === 'siamsi' && styles.gameTabItemActive]}
              onPress={() => setActiveGameTab('siamsi')}
            >
              <Text style={[styles.gameTabText, activeGameTab === 'siamsi' && styles.gameTabTextActive]}>
                🎋 เซียมซี
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gameTabItem, activeGameTab === 'egg' && styles.gameTabItemActive]}
              onPress={() => setActiveGameTab('egg')}
            >
              <Text style={[styles.gameTabText, activeGameTab === 'egg' && styles.gameTabTextActive]}>
                🥚 ไข่มังกร
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gameTabItem, activeGameTab === 'water' && styles.gameTabItemActive]}
              onPress={() => setActiveGameTab('water')}
            >
              <Text style={[styles.gameTabText, activeGameTab === 'water' && styles.gameTabTextActive]}>
                🕯️ น้ำตาเทียน
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.gameScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 🎡 TAB 1: MEGA LUCKY WHEEL */}
            {activeGameTab === 'wheel' && (
              <View style={styles.gameCardContainer}>
                <Text style={styles.gameCardTitle}>🎡 วงล้อมหาลาภแปดทิศ</Text>
                <Text style={styles.gameCardSubtitle}>แตะปุ่มเพื่อหมุนวงล้อเสี่ยงทายเลขมงคลและคำอวยพร</Text>

                <View style={styles.bigWheelWrapper}>
                  <View style={styles.brassPointerOuter}>
                    <View style={styles.brassPointerTriangle} />
                  </View>

                  <View style={styles.bigWheelBezel}>
                    <Animated.View
                      style={[
                        styles.bigWheelCore,
                        { transform: [{ rotate: gameSpinInterpolate }] },
                      ]}
                    >
                      <View style={[styles.wheelSector, { backgroundColor: '#8b1d20', top: 0, left: 0 }]} />
                      <View style={[styles.wheelSector, { backgroundColor: '#d4af37', top: 0, right: 0 }]} />
                      <View style={[styles.wheelSector, { backgroundColor: '#1e3f2b', bottom: 0, left: 0 }]} />
                      <View style={[styles.wheelSector, { backgroundColor: '#e5ca85', bottom: 0, right: 0 }]} />

                      <View style={[styles.wheelSectorDiagonal, { transform: [{ rotate: '45deg' }] }]}>
                        <View style={[styles.wheelSector, { backgroundColor: '#e5ca85', top: 0, left: 0 }]} />
                        <View style={[styles.wheelSector, { backgroundColor: '#8b1d20', top: 0, right: 0 }]} />
                        <View style={[styles.wheelSector, { backgroundColor: '#d4af37', bottom: 0, left: 0 }]} />
                        <View style={[styles.wheelSector, { backgroundColor: '#1e3f2b', bottom: 0, right: 0 }]} />
                      </View>

                      <View style={styles.bigWheelCenter}>
                        <Image source={STAMP_ICON} style={styles.bigWheelCenterImg} />
                      </View>
                    </Animated.View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.gameMainActionBtn}
                  activeOpacity={0.85}
                  onPress={handleSpinGameWheel}
                >
                  <Text style={styles.gameMainActionBtnText}>✨ แตะเพื่อหมุนวงล้อ ✨</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🎋 TAB 2: TEMPLE SIAM SI FORTUNE */}
            {activeGameTab === 'siamsi' && (
              <View style={styles.gameCardContainer}>
                <Text style={styles.gameCardTitle}>🎋 วิหารเซียมซีเสี่ยงทาย</Text>
                <Text style={styles.gameCardSubtitle}>ตั้งจิตอธิษฐานแล้วแตะเขย่ากระบอกไม้ไผ่โบราณ</Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleFortunePress}
                  style={styles.gameSiamsiCupBox}
                >
                  <Animated.View
                    style={[
                      styles.cupBarrel,
                      { width: 140, height: 160, transform: [{ translateX: cupShakeAnim }] },
                    ]}
                  >
                    <View style={styles.brassBandTop}>
                      <View style={styles.brassRivet} />
                      <View style={styles.brassRivet} />
                    </View>
                    <View style={styles.vintageTemplePlaque}>
                      <View style={styles.plaqueGoldBorder}>
                        <Text style={styles.plaqueHeaderDecor}>❖ 🎋 ❖</Text>
                        <Text style={styles.cupTitle}>แตะเขย่า</Text>
                      </View>
                    </View>
                    <View style={styles.brassBandBottom}>
                      <View style={styles.brassRivet} />
                      <View style={styles.brassRivet} />
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {siamsiResult ? (
                  <View style={styles.siamsiResultCard}>
                    <View style={styles.siamsiCardHeader}>
                      <Text style={styles.siamsiCardNum}>ไม้ที่ ๑๒</Text>
                      <Text style={styles.siamsiCardTitle}>{siamsiResult.title}</Text>
                    </View>
                    <View style={styles.modalDividerLine} />
                    <Text style={styles.siamsiCardDesc}>{siamsiResult.desc}</Text>
                  </View>
                ) : (
                  <Text style={styles.siamsiPrompt}>แตะที่กระบอกเพื่อเขย่ารับใบเซียมซี</Text>
                )}
              </View>
            )}

            {/* 🥚 TAB 3: GOLDEN DRAGON PING PONG BALL DRAW */}
            {activeGameTab === 'egg' && (
              <View style={styles.gameCardContainer}>
                <Text style={styles.gameCardTitle}>🥚 ล้วงไข่มังกรทองคำ</Text>
                <Text style={styles.gameCardSubtitle}>ล้วงลูกปิงปองนำโชคจากไหศาลเจ้ามังกร</Text>

                <View style={styles.eggJarZone}>
                  <TouchableOpacity
                    style={styles.eggJarButton}
                    activeOpacity={0.85}
                    onPress={handleDrawEgg}
                  >
                    <Text style={styles.eggJarIcon}>🏺</Text>
                    <Text style={styles.eggJarText}>แตะล้วงลูกปิงปอง ✨</Text>
                  </TouchableOpacity>
                </View>

                {drawnEggs.length > 0 && (
                  <View style={styles.drawnEggsContainer}>
                    <Text style={styles.drawnEggsTitle}>ลูกปิงปองที่ล้วงได้:</Text>
                    <View style={styles.drawnEggsRow}>
                      {drawnEggs.map((egg, i) => (
                        <View key={i} style={styles.eggBall}>
                          <Text style={styles.eggBallText}>{egg}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 🕯️ TAB 4: HOLY WATER WAX DIVINATION */}
            {activeGameTab === 'water' && (
              <View style={styles.gameCardContainer}>
                <Text style={styles.gameCardTitle}>🕯️ หยดเทียนมงคลในอ่างน้ำมนต์</Text>
                <Text style={styles.gameCardSubtitle}>หยดน้ำตาเทียนชัยลงในขันน้ำมนต์ศักดิ์สิทธิ์เพื่อดูตัวเลข</Text>

                <View style={styles.waterBowlZone}>
                  <View style={styles.waterBowl}>
                    <Text style={styles.waterBowlLotus}>🪷</Text>
                    <Text style={styles.waterBowlNumbers}>
                      {waterDrops.length > 0 ? waterDrops[0] : '...'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.gameMainActionBtn}
                  activeOpacity={0.85}
                  onPress={handleDropWax}
                >
                  <Text style={styles.gameMainActionBtnText}>🕯️ แตะเพื่อหยดเทียนมงคล</Text>
                </TouchableOpacity>

                {waterDrops.length > 0 && (
                  <View style={styles.waterHistoryBox}>
                    <Text style={styles.drawnEggsTitle}>เลขหยดเทียนที่ผ่านมา:</Text>
                    <View style={styles.waterHistoryRow}>
                      {waterDrops.map((d, i) => (
                        <View key={i} style={styles.waterHistoryPill}>
                          <Text style={styles.waterHistoryPillText}>{d}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 📜 SAVED LUCKY NUMBERS TRAY */}
            {savedLuckyNumbers.length > 0 && (
              <View style={styles.luckyTrayCard}>
                <View style={styles.luckyTrayHeader}>
                  <Text style={styles.luckyTrayTitle}>⭐ เลขมงคลที่ได้รับวันนี้ ({savedLuckyNumbers.length})</Text>
                  <TouchableOpacity onPress={() => setSavedLuckyNumbers([])}>
                    <Text style={styles.clearSearchText}>ล้าง</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.luckyTrayRow}>
                  {savedLuckyNumbers.map((num, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.luckyTrayPill}
                      onPress={() => {
                        const clean = num.replace(/\D/g, '');
                        if (clean.length === 6) {
                          setInputNumber(clean);
                        } else {
                          setInputNumber(clean.padEnd(6, '0'));
                        }
                        setGameModalVisible(false);
                        showToast(`นำเลข [ ${num} ] ไปใส่ที่ช่องตรวจรางวัลแล้ว`);
                      }}
                    >
                      <Text style={styles.luckyTrayPillText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.luckyTrayHint}>แตะที่ตัวเลขเพื่อนำไปใส่ในช่องตรวจรางวัลที่หน้าหลัก</Text>
              </View>
            )}

            <View style={{ height: insets.bottom + 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* 🗄️ FULL HISTORICAL LOTTERY SCREEN / MODAL (หน้าคลังผลย้อนหลังสมบูรณ์แบบ) */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          {/* Background Wallpaper */}
          <Image
            source={BG_IMAGE}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />

          {/* History Top Bar with Antique Back Button */}
          <View style={styles.historyHeaderBar}>
            <TouchableOpacity
              style={styles.historyBackBtn}
              activeOpacity={0.8}
              onPress={() => setHistoryModalVisible(false)}
            >
              <View style={styles.historyBackIconCircle}>
                <Text style={styles.historyBackIconGlyph}>❮</Text>
              </View>
              <Text style={styles.historyBackBtnText}>กลับสู่โต๊ะ</Text>
            </TouchableOpacity>

            <View style={styles.historyHeaderTitleBox}>
              <Text style={styles.historyMainTitle}>🗄️ คลังสลากย้อนหลัง</Text>
              <Text style={styles.historySubTitle}>หอจดหมายเหตุผลสลากกินแบ่งรัฐบาล</Text>
            </View>
          </View>

          {/* Search Box & Quick Stats Bar */}
          <View style={styles.historySearchContainer}>
            <TextInput
              style={styles.historySearchInput}
              placeholder="🔍 ค้นหาเลข ๒ ตัว, ๓ ตัว หรือ ๖ ตัว..."
              placeholderTextColor="#927255"
              value={historySearchQuery}
              onChangeText={setHistorySearchQuery}
              keyboardType="numbers-and-punctuation"
            />
            {historySearchQuery ? (
              <TouchableOpacity
                onPress={() => setHistorySearchQuery('')}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>✕ ล้าง</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Historical Draws List */}
          <ScrollView
            contentContainerStyle={styles.historyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredHistory.map((item, idx) => {
              const isSelected = item.rawDate === lottery.rawDate;
              return (
                <View
                  key={item.rawDate}
                  style={[
                    styles.historyCard,
                    isSelected && styles.historyCardSelected,
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.historyCardHeader}>
                    <View style={styles.historyDateBadge}>
                      <Text style={styles.historyDateBadgeText}>งวดประจำวันที่ {item.date}</Text>
                    </View>
                    {idx === 0 && (
                      <View style={styles.latestBadgePill}>
                        <Text style={styles.latestBadgePillText}>งวดล่าสุด ✨</Text>
                      </View>
                    )}
                  </View>

                  {/* 1st Prize & 2-Digits Banner */}
                  <View style={styles.historyPrizesRow}>
                    <View style={styles.historyPrize1Box}>
                      <Text style={styles.historyPrize1Label}>รางวัลที่ ๑ (๖,๐๐๐,๐๐๐ บ.)</Text>
                      <Text style={styles.historyPrize1Num}>{item.firstPrize}</Text>
                    </View>

                    <View style={styles.history2DigitBox}>
                      <Text style={styles.history2DigitLabel}>เลขท้าย ๒ ตัว</Text>
                      <Text style={styles.history2DigitNum}>{item.backTwo}</Text>
                    </View>
                  </View>

                  {/* 3-Digits Sub Prizes */}
                  <View style={styles.history3DigitsRow}>
                    <View style={styles.history3DigitCol}>
                      <Text style={styles.history3DigitLabel}>หน้า ๓ ตัว (๔,๐๐๐ บ.)</Text>
                      <Text style={styles.history3DigitNum}>{item.frontThree.join('   ')}</Text>
                    </View>

                    <View style={styles.historyDividerV} />

                    <View style={styles.history3DigitCol}>
                      <Text style={styles.history3DigitLabel}>ท้าย ๓ ตัว (๔,๐๐๐ บ.)</Text>
                      <Text style={styles.history3DigitNum}>{item.backThree.join('   ')}</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.historyCardActions}>
                    <TouchableOpacity
                      style={styles.historySelectBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        const targetIdx = LOTTERY_DRAWS_DATABASE.findIndex(d => d.rawDate === item.rawDate);
                        if (targetIdx >= 0) setCurrentDrawIndex(targetIdx);
                        setHistoryModalVisible(false);
                        showToast(`สลับไปดูงวด ${item.date} บนโต๊ะแล้ว`);
                      }}
                    >
                      <Text style={styles.historySelectBtnText}>
                        {isSelected ? '✓ แสดงบนโต๊ะอยู่' : 'นำงวดนี้ไปเปิดบนโต๊ะ ❯'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.historyFullSheetBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        const fullText = [
                          `• รางวัลที่ ๑ : ${item.firstPrize} (๖,๐๐๐,๐๐๐ บาท)`,
                          `• ข้างเคียงรางวัลที่ ๑ : ${(item.adjacentFirstPrize || []).join(', ')} (๑๐๐,๐๐๐ บาท)`,
                          `• เลขหน้า ๓ ตัว : ${item.frontThree.join(', ')} (๔,๐๐๐ บาท)`,
                          `• เลขท้าย ๓ ตัว : ${item.backThree.join(', ')} (๔,๐๐๐ บาท)`,
                          `• เลขท้าย ๒ ตัว : ${item.backTwo} (๒,๐๐๐ บาท)`,
                          item.secondPrize?.length ? `• รางวัลที่ ๒ : ${item.secondPrize.slice(0, 3).join(', ')}... (๒๐๐,๐๐๐ บาท)` : '',
                        ].filter(Boolean).join('\n');

                        openSheet(`📜 ใบตรวจฉบับเต็ม งวด ${item.date}`, fullText);
                      }}
                    >
                      <Text style={styles.historyFullSheetBtnText}>ใบตรวจเต็ม 📜</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={{ height: insets.bottom + 30 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* 🛡️ APP LAUNCH DISCLAIMER & POLICY NOTICE MODAL (ส่งจาก API เว็บไซต์ก่อนเข้าแอป) */}
      <Modal
        visible={disclaimerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDisclaimerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.parchmentModalSheet, styles.disclaimerModalSheet]}>
            {/* Stamp Badge */}
            <View style={styles.disclaimerHeaderRow}>
              <View style={styles.modalSealBadge}>
                <Text style={styles.modalSealBadgeText}>เจริญไทย ตรวจผลสลาก</Text>
              </View>
              <View style={styles.policyComplianceBadge}>
                <Text style={styles.policyComplianceText}>Google Play Policy Compliant</Text>
              </View>
            </View>

            <Text style={styles.disclaimerTitle}>{policyNotice.title}</Text>
            <Text style={styles.disclaimerSubTitle}>{policyNotice.subTitle}</Text>
            <View style={styles.modalDividerLine} />

            <View style={styles.disclaimerMessageBox}>
              <Text style={styles.disclaimerMessageText}>{policyNotice.message}</Text>
            </View>

            {/* Actions */}
            <View style={styles.disclaimerActionRow}>
              <TouchableOpacity
                style={styles.disclaimerConfirmBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setDisclaimerVisible(false);
                  handleOpenWebsite();
                }}
              >
                <Text style={styles.disclaimerConfirmBtnText}>
                  {policyNotice.confirmButtonText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.disclaimerWebLinkBtn}
                activeOpacity={0.8}
                onPress={() => Linking.openURL('https://www.glo.or.th')}
              >
                <Text style={styles.disclaimerWebLinkText}>
                  🏛️ แหล่งข้อมูลทางการ: สำนักงานสลาก (glo.or.th) ↗
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.disclaimerWebLinkBtn}
                activeOpacity={0.8}
                onPress={handleOpenPrivacy}
              >
                <Text style={styles.disclaimerWebLinkText}>
                  อ่านนโยบายความเป็นส่วนตัว 🌐
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🌐 IN-APP WEBVIEW MODAL (เปิดหน้าเว็บทันทีในแอป ไม่เด้งออกไปข้างนอก) */}
      <InAppBrowserModal
        visible={inAppWebModalVisible}
        url={serverWebsiteUrl || policyNotice.websiteUrl || 'https://charoen-thai.xyz'}
        onClose={() => setInAppWebModalVisible(false)}
        title="เว็บไซต์เจริญไทย"
      />

      {/* 📜 Parchment Info Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.parchmentModalSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalSealBadge}>
              <Text style={styles.modalSealBadgeText}>เจริญไทย</Text>
            </View>

            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <View style={styles.modalDividerLine} />
            <Text style={styles.modalText}>{modalText}</Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              activeOpacity={0.85}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>ปิดหน้ากระดาษ ✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#382017',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 12, 6, 0.12)',
  },

  scrollContent: {
    paddingHorizontal: 16,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },

  // 🪧 Brand Header
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brand: {
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoMini: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#c39b4f',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // 🌟 Prominent Bouncing VIP Visit Website Button
  prominentWebBtnContainer: {
    marginBottom: 14,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  prominentWebBtn: {
    backgroundColor: '#8d1d1f',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e8c97e',
  },
  webBtnLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  webBtnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#521012',
    borderWidth: 1.5,
    borderColor: '#d4af37',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webBtnAppLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  webBtnTextWrap: {
    flex: 1,
  },
  webBtnTaglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  pulsingGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#66bb6a',
  },
  webBtnTagline: {
    color: '#f3e1b0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  webBtnMainTitle: {
    color: '#faeed6',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  webBtnActionBadge: {
    backgroundColor: '#faeed6',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#b88c30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  webBtnActionText: {
    color: '#8d1d1f',
    fontSize: 11,
    fontWeight: '900',
  },
  brandTaglineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#8d1d1f',
    marginRight: 5,
  },
  brandSub: {
    color: '#3d2417',
    fontSize: 10,
    fontWeight: '700',
  },
  brandTitle: {
    color: '#261208',
    fontSize: 27,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  editionBadge: {
    backgroundColor: '#261208',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c39b4f',
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  editionBadgeInner: {
    backgroundColor: '#3a1f13',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    alignItems: 'center',
  },
  editionBadgeLabel: {
    color: '#d4af37',
    fontSize: 7.5,
    fontWeight: '700',
  },
  editionText: {
    color: '#faeed6',
    fontSize: 10,
    fontWeight: '800',
  },

  // 🔍 0. GLO Checker Card
  checkerCard: {
    backgroundColor: '#fbf4e4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#c29a4a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  checkerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkerTitle: {
    color: '#261208',
    fontSize: 12.5,
    fontWeight: '800',
  },
  checkerDatePill: {
    backgroundColor: '#ebd8b0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checkerSubtitle: {
    color: '#8d1d1f',
    fontSize: 9.5,
    fontWeight: '800',
  },
  checkerInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  checkerInput: {
    flex: 1,
    backgroundColor: '#fffdf7',
    borderWidth: 1.5,
    borderColor: '#cbb38e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#261208',
    letterSpacing: 1,
  },
  checkerBtn: {
    backgroundColor: '#8d1d1f',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8c97e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 88,
  },
  checkerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  quickTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  quickTestLabel: {
    fontSize: 9.5,
    color: '#6e4f3a',
    fontWeight: '700',
  },
  quickPill: {
    backgroundColor: '#f1e2c1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cca862',
  },
  quickPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#462b1b',
  },

  // 📰 1. Newspaper Card
  newspaperWrapper: {
    marginBottom: 14,
  },
  newspaper: {
    backgroundColor: '#f6eedc',
    borderRadius: 6,
    padding: 16,
    shadowColor: '#100603',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(92, 64, 40, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  verticalFoldCrease: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '51%',
    width: 1,
    backgroundColor: 'rgba(70, 48, 30, 0.12)',
  },
  verticalFoldHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '51.5%',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  mast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 4,
  },
  mastName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2b1b13',
  },
  mastSubtitle: {
    fontSize: 9,
    color: '#5c4033',
    marginTop: 1,
  },
  mastRightBox: {
    alignItems: 'flex-end',
  },
  stampBadgeMini: {
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  stampBadgeMiniText: {
    color: '#fff5e0',
    fontSize: 8.5,
    fontWeight: '800',
  },
  mastDate: {
    fontSize: 8.5,
    color: '#5c4033',
    textAlign: 'right',
    lineHeight: 11,
  },
  vintageDoubleBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  vintageBorderLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(60, 40, 25, 0.45)',
  },
  vintageBorderIcon: {
    fontSize: 9,
    color: 'rgba(60, 40, 25, 0.6)',
    paddingHorizontal: 6,
  },
  prizeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  prizeRibbon: {
    backgroundColor: '#382218',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
  },
  headline: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f8eed9',
    letterSpacing: 0.8,
  },
  prizeAmount: {
    fontSize: 10.5,
    color: '#5c4033',
    fontWeight: '700',
  },
  firstPrizeContainer: {
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  firstPrizeShadow: {
    position: 'absolute',
    top: 2,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 5,
    color: 'rgba(70, 20, 20, 0.2)',
  },
  firstPrize: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 5,
    color: '#8d1d1f',
    textAlign: 'center',
  },
  numbersBoxFrame: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(80, 50, 30, 0.2)',
    borderRadius: 5,
    padding: 8,
    marginTop: 2,
  },
  numbersGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  numCol: {
    flex: 1,
    alignItems: 'center',
  },
  highlightCol: {
    backgroundColor: 'rgba(141, 29, 31, 0.08)',
    borderRadius: 4,
    paddingVertical: 2,
  },
  colDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(80, 50, 30, 0.2)',
  },
  numLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#462e22',
    marginBottom: 2,
  },
  numValueWrap: {
    backgroundColor: '#fffcf5',
    borderWidth: 1,
    borderColor: 'rgba(70, 45, 28, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  highlightValueWrap: {
    backgroundColor: '#fff0ee',
    borderColor: 'rgba(141, 29, 31, 0.3)',
    justifyContent: 'center',
    minHeight: 38,
  },
  numValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2b1b13',
  },
  numValueSmall: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#2b1b13',
    lineHeight: 16,
  },
  paperCornerCurl: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderRightWidth: 22,
    borderBottomWidth: 22,
    borderRightColor: '#d6c6a2',
    borderBottomColor: '#2b1b13',
  },

  // 📌 2. Scatter Row
  scatter: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    alignItems: 'stretch',
  },
  noteWrapper: {
    flex: 1.1,
  },
  note: {
    backgroundColor: '#f2dc9f',
    height: 168,
    padding: 12,
    borderRadius: 4,
    shadowColor: '#0a0402',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(120, 85, 45, 0.22)',
    justifyContent: 'space-between',
  },
  realisticTape: {
    position: 'absolute',
    top: -8,
    left: '28%',
    width: 58,
    height: 18,
    backgroundColor: 'rgba(240, 225, 180, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(140, 100, 60, 0.25)',
    transform: [{ rotate: '-4deg' }],
    zIndex: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  scribble: {
    fontSize: 11,
    fontWeight: '800',
    color: '#382218',
  },
  noteDateTag: {
    fontSize: 8.5,
    color: '#6b4c37',
    fontWeight: '700',
  },
  noteBigNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  bigNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1a3c28',
  },
  inkCircleStamp: {
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: '#8d1d1f',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    transform: [{ rotate: '12deg' }],
  },
  inkCircleText: {
    color: '#8d1d1f',
    fontSize: 8.5,
    fontWeight: '900',
  },
  miniText: {
    fontSize: 9,
    lineHeight: 13,
    color: '#422c1e',
    fontWeight: '600',
  },
  noteBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  noteActionPill: {
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8c97e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  noteActionPillText: {
    color: '#faeed6',
    fontSize: 9.5,
    fontWeight: '900',
  },

  // 🎋 Antique Bamboo Siam Si Cup
  cupWrapper: {
    flex: 0.95,
  },
  cupTouchArea: {
    alignItems: 'center',
  },
  sticksContainer: {
    height: 44,
    width: '100%',
    position: 'relative',
    marginTop: -12,
    alignItems: 'center',
    zIndex: 5,
  },
  bambooStick: {
    position: 'absolute',
    bottom: 0,
    width: 8.5,
    height: 60,
    backgroundColor: '#cca35e',
    borderRadius: 3.5,
    borderWidth: 0.8,
    borderColor: '#7a4e1d',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  stick1: { zIndex: 1, backgroundColor: '#c2964f' },
  stick2: { zIndex: 3, backgroundColor: '#d4aa65' },
  stick3: { zIndex: 4, backgroundColor: '#dbb370' },
  stick4: { zIndex: 3, backgroundColor: '#caa05a' },
  stick5: { zIndex: 2, backgroundColor: '#be924b' },
  stick6: { zIndex: 1, backgroundColor: '#b58740' },
  stickGrainHighlight: {
    position: 'absolute',
    left: 1,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  stickRedTip: {
    height: 15,
    backgroundColor: '#7e171a',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d4af37',
  },
  stickNum: {
    color: '#faeed6',
    fontSize: 7.5,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cupBarrel: {
    width: '100%',
    height: 146,
    backgroundColor: '#200f07',
    borderRadius: 14,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
    borderWidth: 1.8,
    borderColor: '#421f10',
    position: 'relative',
    overflow: 'hidden',
  },
  woodSlatsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  woodSlatLine: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  brassBandTop: {
    width: '112%',
    height: 10,
    backgroundColor: '#b88c30',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#6b4f14',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  brassBandBottom: {
    width: '112%',
    height: 8,
    backgroundColor: '#b88c30',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#6b4f14',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  brassRivet: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#faeed6',
    borderWidth: 0.5,
    borderColor: '#4d370c',
  },
  cylinderHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 12,
    width: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  cylinderShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  vintageTemplePlaque: {
    width: '88%',
    backgroundColor: '#6b1416',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
    marginVertical: 4,
  },
  plaqueGoldBorder: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.6)',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: '#520e10',
  },
  plaqueHeaderDecor: {
    fontSize: 10,
    color: '#d4af37',
    letterSpacing: 2,
    marginBottom: 1,
  },
  cupTitle: {
    color: '#faeed6',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  plaqueDivider: {
    width: '60%',
    height: 1,
    backgroundColor: '#d4af37',
    marginVertical: 3,
    opacity: 0.7,
  },
  cupSubtitle: {
    color: '#e5ca85',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // 🎟️ 3. Ticket Stack
  ticketStackWrapper: {
    marginBottom: 14,
  },
  ticketStack: {
    position: 'relative',
  },
  ticketLayer: {
    borderRadius: 6,
  },
  ticketLayer2: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    bottom: -4,
    backgroundColor: '#ebe0cb',
    transform: [{ rotate: '1.8deg' }],
    opacity: 0.75,
    borderWidth: 1,
    borderColor: 'rgba(60, 40, 20, 0.25)',
  },
  ticketLayerTop: {
    backgroundColor: '#faf4e6',
    borderWidth: 1.5,
    borderColor: '#bda078',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    transform: [{ rotate: '-0.8deg' }],
    shadowColor: '#100502',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ticketStub: {
    alignItems: 'center',
    paddingRight: 8,
    width: 60,
  },
  stubSerial: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8d1d1f',
  },
  stubBarcode: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  stubBatch: {
    fontSize: 7.5,
    color: '#6e4f3a',
    fontWeight: '700',
  },
  perforationLine: {
    width: 1,
    height: 38,
    justifyContent: 'space-between',
    marginRight: 10,
  },
  perforationHole: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#bba282',
  },
  ticketMainBody: {
    flex: 1,
  },
  ticketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ticketTypeBadge: {
    backgroundColor: '#2b1b13',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
    marginRight: 6,
  },
  ticketTypeBadgeText: {
    color: '#f8eed9',
    fontSize: 8.5,
    fontWeight: '800',
  },
  ticketWatermarkText: {
    fontSize: 8,
    color: '#8f725a',
    fontWeight: '600',
  },
  ticketMainTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2b1b13',
  },
  ticketPillBadge: {
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8c97e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketPillBadgeText: {
    color: '#faeed6',
    fontSize: 10,
    fontWeight: '900',
  },

  // 🎡 4. Lucky Wheel
  wheelZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: 'rgba(38, 18, 10, 0.65)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#c99e45',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  wheelCopy: {
    flex: 1,
    paddingRight: 10,
  },
  wheelTaglineWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  wheelTagline: {
    color: '#e5ca85',
    fontSize: 9,
    fontWeight: '700',
  },
  wheelTitle: {
    color: '#faeed6',
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 3,
  },
  wheelDesc: {
    color: '#d4b88e',
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  spinButtonAction: {
    backgroundColor: '#8d1d1f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5ca85',
  },
  spinButtonText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  wheelUnitContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brassPointerOuter: {
    position: 'absolute',
    top: -10,
    zIndex: 20,
    alignItems: 'center',
  },
  brassPointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#f3e1b0',
  },
  brassBezelRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#c99e45',
    backgroundColor: '#2b160e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  wheelCore: {
    width: 108,
    height: 108,
    borderRadius: 54,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelSector: {
    position: 'absolute',
    width: '50%',
    height: '50%',
  },
  wheelSectorDiagonal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  wheelCenterMedallion: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#d4af37',
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: '#521012',
  },
  wheelCenterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },

  // 📜 Footer & Visit Web Button
  footerContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  visitWebBtn: {
    backgroundColor: '#3a1f13',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitWebBtnLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  visitWebBtnText: {
    color: '#faeed6',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerNote: {
    color: '#3d2417',
    opacity: 0.85,
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '600',
  },

  // 🏮 Floating Stamp Button
  waxSealStampBtn: {
    position: 'absolute',
    right: 18,
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: '#e8c97e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 50,
    overflow: 'hidden',
    backgroundColor: '#521012',
  },
  waxSealOpen: {
    transform: [{ rotate: '18deg' }, { scale: 0.94 }],
    borderColor: '#ffd700',
  },
  stampImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },

  // Fan Menu
  fanContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 49,
  },
  fanItem: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  fanBtn: {
    backgroundColor: '#f1e6cc',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#c29a4a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  fanBtnGold: {
    backgroundColor: '#faeed6',
    borderColor: '#8d1d1f',
    borderWidth: 2,
  },
  fanBtnLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fanBtnLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  fanBtnText: {
    color: '#2b1b13',
    fontSize: 11.5,
    fontWeight: '800',
  },

  // Toast
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#26120b',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 60,
    maxWidth: width - 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 9,
    borderWidth: 1.5,
    borderColor: '#d4af37',
  },
  toastText: {
    color: '#faeed6',
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },

  // 🗄️ FULL HISTORICAL LOTTERY SCREEN STYLES
  historyHeaderBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 18, 10, 0.85)',
    borderBottomWidth: 2,
    borderBottomColor: '#c39b4f',
  },
  historyBackBtn: {
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#e8c97e',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  historyBackIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6b1416',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 0.8,
    borderColor: '#dfb74a',
  },
  historyBackIconGlyph: {
    color: '#faeed6',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: -1,
  },
  historyBackBtnText: {
    color: '#faeed6',
    fontSize: 11,
    fontWeight: '800',
  },
  historyHeaderTitleBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  historyMainTitle: {
    color: '#faeed6',
    fontSize: 16,
    fontWeight: '900',
  },
  historySubTitle: {
    color: '#d4af37',
    fontSize: 9.5,
    fontWeight: '700',
  },
  historySearchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(251, 244, 228, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#cbb38e',
  },
  historySearchInput: {
    flex: 1,
    backgroundColor: '#fffdf7',
    borderWidth: 1.2,
    borderColor: '#c29a4a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: '#261208',
    fontWeight: '700',
  },
  clearSearchBtn: {
    marginLeft: 8,
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  historyScrollContent: {
    padding: 16,
    gap: 14,
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  historyCard: {
    backgroundColor: '#fbf4e4',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#c39b4f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  historyCardSelected: {
    borderColor: '#8d1d1f',
    borderWidth: 2,
    backgroundColor: '#fff9ed',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDateBadge: {
    backgroundColor: '#3a1f13',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c29a4a',
  },
  historyDateBadgeText: {
    color: '#faeed6',
    fontSize: 11.5,
    fontWeight: '900',
  },
  latestBadgePill: {
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  latestBadgePillText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  historyPrizesRow: {
    flexDirection: 'row',
    backgroundColor: '#fffcf5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dec9a4',
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyPrize1Box: {
    flex: 1.3,
  },
  historyPrize1Label: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#5c4033',
  },
  historyPrize1Num: {
    fontSize: 26,
    fontWeight: '900',
    color: '#8d1d1f',
    letterSpacing: 2,
  },
  history2DigitBox: {
    alignItems: 'center',
    backgroundColor: '#fff0ee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(141, 29, 31, 0.25)',
  },
  history2DigitLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8d1d1f',
  },
  history2DigitNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#8d1d1f',
  },
  history3DigitsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e8dbbe',
    marginBottom: 10,
    alignItems: 'center',
  },
  history3DigitCol: {
    flex: 1,
    alignItems: 'center',
  },
  historyDividerV: {
    width: 1,
    height: 24,
    backgroundColor: '#dec9a4',
  },
  history3DigitLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#5c4033',
    marginBottom: 2,
  },
  history3DigitNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#261208',
  },
  historyCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historySelectBtn: {
    flex: 1,
    backgroundColor: '#8d1d1f',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8c97e',
  },
  historySelectBtnText: {
    color: '#faeed6',
    fontSize: 11,
    fontWeight: '800',
  },
  historyFullSheetBtn: {
    backgroundColor: '#ede0c4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bda078',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyFullSheetBtnText: {
    color: '#3a1f13',
    fontSize: 10.5,
    fontWeight: '800',
  },

  // 🎮 GAME HUB SCREEN STYLES
  gameHeaderBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(38, 18, 10, 0.9)',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  gameTabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 14, 8, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#c39b4f',
    justifyContent: 'space-around',
  },
  gameTabItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  gameTabItemActive: {
    backgroundColor: '#8d1d1f',
    borderWidth: 1,
    borderColor: '#e8c97e',
  },
  gameTabText: {
    color: '#d4b88e',
    fontSize: 11,
    fontWeight: '700',
  },
  gameTabTextActive: {
    color: '#faeed6',
    fontWeight: '900',
  },
  gameScrollContent: {
    padding: 16,
    gap: 14,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  gameCardContainer: {
    backgroundColor: '#fbf4e4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#c39b4f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  gameCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#261208',
    marginBottom: 2,
    textAlign: 'center',
  },
  gameCardSubtitle: {
    fontSize: 10.5,
    color: '#5c4033',
    marginBottom: 16,
    textAlign: 'center',
  },
  bigWheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  bigWheelBezel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 10,
    borderColor: '#c99e45',
    backgroundColor: '#2b160e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  bigWheelCore: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  bigWheelCenter: {
    position: 'absolute',
    top: 50,
    left: 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#d4af37',
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: '#521012',
  },
  bigWheelCenterImg: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  gameMainActionBtn: {
    backgroundColor: '#8d1d1f',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#e8c97e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 10,
  },
  gameMainActionBtnText: {
    color: '#faeed6',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gameSiamsiCupBox: {
    marginVertical: 10,
    alignItems: 'center',
  },
  siamsiPrompt: {
    color: '#8d1d1f',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  siamsiResultCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#cbb38e',
    width: '100%',
    marginTop: 12,
  },
  siamsiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siamsiCardNum: {
    backgroundColor: '#8d1d1f',
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  siamsiCardTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#261208',
  },
  siamsiCardDesc: {
    fontSize: 11.5,
    color: '#3d2417',
    lineHeight: 18,
    fontWeight: '600',
  },
  eggJarZone: {
    marginVertical: 14,
    alignItems: 'center',
  },
  eggJarButton: {
    backgroundColor: '#3a1f13',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d4af37',
    alignItems: 'center',
  },
  eggJarIcon: {
    fontSize: 48,
    marginBottom: 6,
  },
  eggJarText: {
    color: '#faeed6',
    fontSize: 13,
    fontWeight: '900',
  },
  drawnEggsContainer: {
    width: '100%',
    marginTop: 10,
  },
  drawnEggsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#462b1b',
    marginBottom: 8,
  },
  drawnEggsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eggBall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d4af37',
    borderWidth: 2,
    borderColor: '#8f701c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  eggBallText: {
    color: '#261208',
    fontSize: 16,
    fontWeight: '900',
  },
  waterBowlZone: {
    marginVertical: 14,
    alignItems: 'center',
  },
  waterBowl: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#1b3a4b',
    borderWidth: 6,
    borderColor: '#c99e45',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  waterBowlLotus: {
    fontSize: 28,
  },
  waterBowlNumbers: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f4ebd2',
    letterSpacing: 4,
    marginTop: 4,
    textShadowColor: '#d4af37',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  waterHistoryBox: {
    width: '100%',
    marginTop: 14,
  },
  waterHistoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  waterHistoryPill: {
    backgroundColor: '#ebd8b0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bda078',
  },
  waterHistoryPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#261208',
    letterSpacing: 2,
  },
  luckyTrayCard: {
    backgroundColor: '#f6eedc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#cbb38e',
    width: '100%',
  },
  luckyTrayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  luckyTrayTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#261208',
  },
  luckyTrayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  luckyTrayPill: {
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8c97e',
  },
  luckyTrayPillText: {
    color: '#faeed6',
    fontSize: 12,
    fontWeight: '900',
  },
  luckyTrayHint: {
    fontSize: 8.5,
    color: '#6e4f3a',
    fontWeight: '600',
  },

  // 📜 Parchment Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 6, 3, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  parchmentModalSheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f4ebd2',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
    borderWidth: 2,
    borderColor: '#caa05a',
    transform: [{ rotate: '-0.5deg' }],
  },
  modalSealBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#8d1d1f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 8,
  },
  modalSealBadgeText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '900',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2b1b13',
    marginBottom: 4,
  },
  modalDividerLine: {
    height: 1,
    backgroundColor: 'rgba(120, 80, 40, 0.2)',
    marginVertical: 8,
  },
  modalText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: '#382218',
    fontWeight: '500',
    marginBottom: 16,
  },
  modalCloseBtn: {
    backgroundColor: '#8d1d1f',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e8c97e',
  },
  modalCloseBtnText: {
    color: '#faeed6',
    fontSize: 12,
    fontWeight: '800',
  },

  // 🛡️ Disclaimer Modal Styles
  disclaimerModalSheet: {
    maxWidth: 440,
    padding: 22,
    borderWidth: 2.5,
    borderColor: '#c39b4f',
    backgroundColor: '#fbf4e4',
  },
  disclaimerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  policyComplianceBadge: {
    backgroundColor: '#261208',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d4af37',
  },
  policyComplianceText: {
    color: '#faeed6',
    fontSize: 8.5,
    fontWeight: '800',
  },
  disclaimerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#261208',
    marginTop: 4,
  },
  disclaimerSubTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8d1d1f',
    marginTop: 2,
  },
  disclaimerMessageBox: {
    backgroundColor: '#fffdf7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dec9a4',
    marginVertical: 10,
  },
  disclaimerMessageText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: '#3d2417',
    fontWeight: '600',
  },
  disclaimerActionRow: {
    gap: 8,
    marginTop: 6,
  },
  disclaimerConfirmBtn: {
    backgroundColor: '#8d1d1f',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#e8c97e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disclaimerConfirmBtnText: {
    color: '#faeed6',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  disclaimerWebLinkBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  disclaimerWebLinkText: {
    color: '#6b4c37',
    fontSize: 10.5,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

import React, { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList, RootStackParamList } from '@/router/types';
import WelcomeScreen from '@/screens/WelcomeScreen';
import CreateWalletScreen from '@/screens/CreateWalletScreen';
import ShowSeedScreen from '@/screens/ShowSeedScreen';
import CreatePasswordScreen from '@/screens/CreatePasswordScreen';
import ImportWalletScreen from '@/screens/ImportWalletScreen';
import HomeScreen from '@/screens/HomeScreen';
import SendScreen from '@/screens/SendScreen';
import ReceiveScreen from '@/screens/ReceiveScreen';
import AccountsScreen from '@/screens/AccountsScreen';
import NetworksScreen from '@/screens/NetworksScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import TokensScreen from '@/screens/TokensScreen';
import CallRealmScreen from '@/screens/CallRealmScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import AppsScreen from '@/screens/AppsScreen';
import DeepLinkConfirmScreen from '@/screens/DeepLinkConfirmScreen';
import { parseDeepLink } from '@/services/deepLink';
import { useWallet } from '@/provider/WalletProvider';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 52 + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.separatorOpaque,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'wallet' : 'wallet-outline',
            Activity: focused ? 'time' : 'time-outline',
            Apps: focused ? 'apps' : 'apps-outline',
            SettingsTab: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={map[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="Activity" component={HistoryScreen} options={{ title: 'Activity' }} />
      <Tab.Screen name="Apps" component={AppsScreen} options={{ title: 'Explore' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.separatorOpaque,
    primary: colors.primary,
    notification: colors.danger,
  },
};

const linking = {
  prefixes: [Linking.createURL('/'), 'gnomobile://'],
  config: {
    screens: {
      DeepLinkConfirm: 'tx',
      CallRealm: 'call',
      MainTabs: 'home',
    },
  },
};

const stackScreenOptions = {
  headerShown: false as const,
  animation: Platform.OS === 'ios' ? ('default' as const) : ('slide_from_right' as const),
  contentStyle: { backgroundColor: colors.bg },
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

export default function RootNavigator() {
  const { accounts, ready } = useWallet();
  const initial = accounts.length > 0 ? 'MainTabs' : 'Welcome';

  if (!ready) {
    return null;
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator initialRouteName={initial} screenOptions={stackScreenOptions}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
        <Stack.Screen name="ShowSeed" component={ShowSeedScreen} />
        <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
        <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Send"
          component={SendScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Receive"
          component={ReceiveScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Accounts" component={AccountsScreen} />
        <Stack.Screen name="Networks" component={NetworksScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Tokens" component={TokensScreen} />
        <Stack.Screen name="CallRealm" component={CallRealmScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="DeepLinkConfirm"
          component={DeepLinkConfirmScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
      <DeepLinkBridge />
    </NavigationContainer>
  );
}

function DeepLinkBridge() {
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const payload = parseDeepLink(url);
      if (payload) console.log('[deep-link]', payload);
    });
    return () => sub.remove();
  }, []);
  return null;
}

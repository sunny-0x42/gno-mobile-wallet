export type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ShowSeed: { phrase: string };
  CreatePassword: { phrase: string };
  ImportWallet: undefined;
  MainTabs: undefined;
  Send: undefined;
  Receive: undefined;
  Accounts: undefined;
  Networks: undefined;
  AddNetwork: undefined;
  History: undefined;
  Tokens: undefined;
  AddToken: undefined;
  CallRealm: { pkgPath?: string; func?: string; args?: string[] } | undefined;
  Settings: undefined;
  DeepLinkConfirm: {
    pkgPath?: string;
    func?: string;
    args?: string[];
    rpc?: string;
    chainId?: string;
  };
  DAppBrowser: {
    url: string;
    title?: string;
    injectAdena?: boolean;
    preferredChainId?: string;
  };
  /** Native GnoSwap router swap (no WebView) */
  Swap: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Activity: undefined;
  Apps: undefined;
  SettingsTab: undefined;
};

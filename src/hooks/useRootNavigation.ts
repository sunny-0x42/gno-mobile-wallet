import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/router/types';

/**
 * Navigate to root stack screens from nested tabs (Send, Receive, …).
 * Fixes silent no-op when calling navigate from Home tab on web.
 */
export function useRootNavigation() {
  const navigation = useNavigation();

  function navigateRoot<Name extends keyof RootStackParamList>(
    name: Name,
    params?: RootStackParamList[Name],
  ) {
    // Bubble to parent stack if present
    let nav: typeof navigation | undefined = navigation;
    // try up to 3 parents
    for (let i = 0; i < 4; i++) {
      const state = nav?.getState?.();
      const names = state?.routeNames as string[] | undefined;
      if (names?.includes(name as string)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (nav as any).navigate(name, params);
        return;
      }
      const parent = nav?.getParent?.();
      if (!parent) break;
      nav = parent as typeof navigation;
    }
    // Fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).navigate(name, params);
  }

  return {
    navigation: navigation as unknown as NativeStackNavigationProp<RootStackParamList>,
    navigateRoot,
  };
}

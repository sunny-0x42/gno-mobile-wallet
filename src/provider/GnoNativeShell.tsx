/**
 * Optional root wrapper for real device builds.
 *
 * Usage in App.tsx:
 *   export default function App() {
 *     return (
 *       <GnoNativeShell>
 *         <WalletProvider>
 *           <RootNavigator />
 *         </WalletProvider>
 *       </GnoNativeShell>
 *     );
 *   }
 *
 * Then call attachNativeGnonative from a child using useGnoNativeContext().
 */
import React, { useEffect } from 'react';
import { BUILTIN_NETWORKS, DEFAULT_NETWORK_ID } from '@/config/networks';
import { useWallet } from '@/provider/WalletProvider';

const defaultNet = BUILTIN_NETWORKS.find((n) => n.id === DEFAULT_NETWORK_ID)!;

type Props = { children: React.ReactNode };

export function GnoNativeShell({ children }: Props) {
  // Lazy load so mock/web does not hard-fail
  let Provider: React.ComponentType<{ config: { remote: string; chain_id: string }; children: React.ReactNode }> | null =
    null;
  let useCtx: (() => { gnonative: unknown }) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@gnolang/gnonative');
    Provider = mod.GnoNativeProvider;
    useCtx = mod.useGnoNativeContext;
  } catch {
    return <>{children}</>;
  }

  if (!Provider) return <>{children}</>;

  return (
    <Provider
      config={{
        remote: defaultNet.remote,
        chain_id: defaultNet.chainId,
      }}
    >
      <AttachNative useCtx={useCtx!} />
      {children}
    </Provider>
  );
}

function AttachNative({ useCtx }: { useCtx: () => { gnonative: unknown } }) {
  const { attachNativeGnonative } = useWallet();
  const { gnonative } = useCtx();
  useEffect(() => {
    if (gnonative) attachNativeGnonative(gnonative);
  }, [gnonative, attachNativeGnonative]);
  return null;
}

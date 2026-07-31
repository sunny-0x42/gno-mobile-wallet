import type { GnoConnectPayload } from '@/types';

/**
 * Parse GnoConnect-style / app deep links.
 *
 * Examples:
 *   gnomobile://tx?pkg=gno.land/r/demo/counter&func=Inc&arg=1
 *   gnomobile://connect?rpc=https://rpc.test13...&chainid=test-13
 *   Relative TxLink: $help&func=Foo&arg1=x  (needs pkg from path)
 */
export function parseDeepLink(url: string): GnoConnectPayload | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'gnomobile:' && u.protocol !== 'https:' && u.protocol !== 'http:') {
      // try generic
    }

    const params = u.searchParams;
    const pkgPath = params.get('pkg') || params.get('pkg_path') || params.get('path') || undefined;
    const func = params.get('func') || params.get('function') || undefined;
    const args: string[] = [];
    params.forEach((value, key) => {
      if (key.startsWith('arg')) args.push(value);
    });
    // also support arg=a&arg=b
    const multi = params.getAll('arg');
    if (multi.length) {
      args.length = 0;
      args.push(...multi);
    }

    const payload: GnoConnectPayload = {
      rpc: params.get('rpc') || params.get('remote') || undefined,
      chainId: params.get('chainid') || params.get('chainId') || undefined,
      pkgPath,
      func,
      args: args.length ? args : undefined,
      send: params.get('send') || undefined,
      rawUrl: url,
    };

    if (!payload.pkgPath && !payload.func && !payload.rpc) {
      // Path-style: gnomobile:///r/demo/counter$func=Inc
      const path = u.pathname || u.host;
      if (path.includes('$') || path.includes('func=')) {
        const [pkg, qs] = path.split('$');
        payload.pkgPath = pkg.replace(/^\//, '');
        if (qs) {
          const sp = new URLSearchParams(qs.startsWith('func') ? qs : `func=${qs}`);
          payload.func = sp.get('func') || undefined;
        }
      }
    }

    if (!payload.pkgPath && !payload.func && !payload.rpc) return null;
    return payload;
  } catch {
    return null;
  }
}

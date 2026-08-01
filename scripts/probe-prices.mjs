const RPC = 'https://rpc.topaz.testnets.gno.land';
const b64e = (s) => Buffer.from(s).toString('base64');
const b64d = (s) => Buffer.from(s, 'base64').toString('utf8');

async function qeval(expr) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: { path: 'vm/qeval', data: b64e(expr), height: '0', prove: false },
  };
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const rb = j?.result?.response?.ResponseBase;
  if (rb?.Error) return { err: String(rb.Error?.value || JSON.stringify(rb.Error)).slice(0, 180) };
  return { data: rb?.Data ? b64d(rb.Data) : null };
}

const USDC = 'gno.land/r/gnoswap/test_token/test_usdc.USDC';
const pairs = [
  ['WUGNOT', 'gno.land/r/gnoland/wugnot.wugnot', '1000000'],
  ['GNS', 'gno.land/r/gnoswap/gns.GNS', '1000000'],
  ['ATOM', 'gno.land/r/gnoswap/test_token/test_atom.ATOM', '1000000'],
  ['BTC', 'gno.land/r/gnoswap/test_token/test_btc.BTC', '100000000'],
  ['DAI', 'gno.land/r/gnoswap/test_token/test_dai.DAI', '1000000'],
  ['USDT', 'gno.land/r/onbloc/ibc/union/apps/ucs03_zkgm.USDT', '1000000'],
];

for (const [sym, id, amt] of pairs) {
  let best = null;
  for (const fee of [100, 500, 3000, 10000]) {
    const route = `${id}:${USDC}:${fee}`;
    const expr = `gno.land/r/gnoswap/router.DrySwapRoute("${id}","${USDC}","${amt}","EXACT_IN","${route}","100","1")`;
    const r = await qeval(expr);
    if (r.data && r.data.includes('true')) {
      best = { fee, data: r.data.replace(/\n/g, ' ').slice(0, 160) };
      break;
    }
  }
  console.log(sym, best || 'no route');
}

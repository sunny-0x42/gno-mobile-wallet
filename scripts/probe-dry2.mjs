const rpc = 'https://rpc.topaz.testnets.gno.land';
async function qeval(expr) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qeval',
      data: Buffer.from(expr).toString('base64'),
      height: '0',
      prove: false,
    },
  };
  const r = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const rb = j.result?.response?.ResponseBase;
  if (rb?.Error) return 'ERR: ' + (rb.Error?.value || JSON.stringify(rb.Error)).slice(0, 350);
  if (!rb?.Data) return 'empty';
  return Buffer.from(rb.Data, 'base64').toString();
}

const a = 'gno.land/r/gnoland/wugnot.wugnot';
const b = 'gno.land/r/gnoswap/gns.GNS';
const usdc = 'gno.land/r/gnoswap/test_token/test_usdc.USDC';
const fee = '3000';
const amount = '1000000';
const route = `${a}:${b}:${fee}`;

for (const t of ['EXACT_IN', 'ExactIn', 'exact_in', 'EXACT_OUT']) {
  const expr = `gno.land/r/gnoswap/router.DrySwapRoute("${a}","${b}","${amount}","${t}","${route}","100","1")`;
  console.log(t, await qeval(expr));
}

for (const fee2 of ['100', '500', '3000', '10000']) {
  const r = `${a}:${b}:${fee2}`;
  const expr = `gno.land/r/gnoswap/router.DrySwapRoute("${a}","${b}","${amount}","EXACT_IN","${r}","100","1")`;
  console.log('fee', fee2, await qeval(expr));
}

const r2 = `${a}:${usdc}:3000`;
console.log('wugnot->usdc', await qeval(`gno.land/r/gnoswap/router.DrySwapRoute("${a}","${usdc}","${amount}","EXACT_IN","${r2}","100","1")`));

const paths = await qeval('gno.land/r/gnoswap/pool.GetPoolPaths(0, 41)');
console.log('all paths len', String(paths).length);
// extract unique token ids
const re = /"([^"]+)"/g;
const set = new Set();
let m;
const s = String(paths);
while ((m = re.exec(s))) {
  const path = m[1];
  const parts = path.split(':');
  if (parts.length >= 2) {
    set.add(parts[0]);
    set.add(parts[1]);
  }
}
console.log('tokens', [...set]);

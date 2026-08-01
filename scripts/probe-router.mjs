const rpc = 'https://rpc.topaz.testnets.gno.land';

async function abci(path, data = '') {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path,
      data: data ? Buffer.from(data).toString('base64') : '',
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
  const d = j.result?.response?.ResponseBase?.Data;
  if (!d) {
    return { err: j.result?.response?.ResponseBase?.Error || j.error || j };
  }
  return Buffer.from(d, 'base64').toString();
}

const docRaw = await abci('vm/qdoc', 'gno.land/r/gnoswap/router');
const doc = JSON.parse(docRaw);
for (const f of doc.funcs || []) {
  console.log('FUNC', f.name, 'crossing=' + f.crossing);
  console.log(f.signature);
  console.log((f.doc || '').slice(0, 400));
  console.log('---');
}

// wugnot path?
const paths = String(await abci('vm/qpaths', 'gno.land/r/gnoswap'));
console.log(
  'tokens',
  paths
    .split('\n')
    .filter((p) => p.includes('token') || p.includes('wugnot') || p.includes('gns')),
);

const input = 'gno.land/r/gnoswap/test_token/test_usdc';
const output = 'gno.land/r/gnoswap/gns';
const amount = '1000000';
const route = `${input}:${output}:3000`;
const expr = `DrySwapRoute("${input}","${output}","${amount}","ExactIn","${route}","100","0")`;
console.log('dry expr', expr);
const dry = await abci('vm/qeval', `gno.land/r/gnoswap/router.${expr}`);
console.log('dry result', dry);

// try fee tiers
for (const fee of ['100', '500', '3000', '10000']) {
  const r = `${input}:${output}:${fee}`;
  const e = `DrySwapRoute("${input}","${output}","${amount}","ExactIn","${r}","100","0")`;
  const res = await abci('vm/qeval', `gno.land/r/gnoswap/router.${e}`);
  console.log('fee', fee, res);
}

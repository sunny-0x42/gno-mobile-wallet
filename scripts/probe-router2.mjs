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
  const rb = j.result?.response?.ResponseBase;
  if (rb?.Error) return { err: rb.Error, log: rb.Log };
  if (!rb?.Data) return { empty: true, j };
  return Buffer.from(rb.Data, 'base64').toString();
}

// common package - how tokens registered
const commonDoc = await abci('vm/qdoc', 'gno.land/r/gnoswap/common');
const cd = typeof commonDoc === 'string' ? JSON.parse(commonDoc) : commonDoc;
console.log('common funcs', (cd.funcs || []).map((f) => f.name + (f.crossing ? '*' : '')).join(', '));

// pool list / registered tokens
for (const expr of [
  'GetSwapFee()',
  'GetImplementationPackagePath()',
]) {
  console.log(expr, await abci('vm/qeval', `gno.land/r/gnoswap/router.${expr}`));
}

// try wugnot / ugnot paths used by gnoswap
const candidates = [
  'gno.land/r/gnoswap/gns',
  'gno.land/r/demo/wugnot',
  'gno.land/r/gnoland/wugnot',
  'gno.land/r/gnoswap/wugnot',
  'ugnot',
];
for (const t of candidates) {
  const dry = await abci(
    'vm/qeval',
    `gno.land/r/gnoswap/router.DrySwapRoute("${t}","gno.land/r/gnoswap/gns","1000000","ExactIn","${t}:gno.land/r/gnoswap/gns:3000","100","0")`,
  );
  console.log('token', t, dry);
}

// pool package docs
const poolDoc = await abci('vm/qdoc', 'gno.land/r/gnoswap/pool');
const pd = typeof poolDoc === 'string' ? JSON.parse(poolDoc) : poolDoc;
console.log(
  'pool funcs',
  (pd.funcs || [])
    .filter((f) => /list|get|pool|token/i.test(f.name))
    .map((f) => f.name)
    .join(', '),
);

// access package
const accDoc = await abci('vm/qdoc', 'gno.land/r/gnoswap/access');
const ad = typeof accDoc === 'string' ? JSON.parse(accDoc) : accDoc;
console.log(
  'access funcs',
  (ad.funcs || []).map((f) => f.name + ' ' + (f.signature || '').slice(0, 100)).join('\n'),
);

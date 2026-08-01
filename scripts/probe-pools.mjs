const rpc = 'https://rpc.topaz.testnets.gno.land';

async function qeval(pkg, expr) {
  const data = `${pkg}.${expr}`;
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qeval',
      data: Buffer.from(data).toString('base64'),
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
  if (rb?.Error) return { err: rb.Error?.value || rb.Error, log: (rb.Log || '').slice(0, 200) };
  if (!rb?.Data) return { empty: true };
  return Buffer.from(rb.Data, 'base64').toString();
}

const pool = 'gno.land/r/gnoswap/pool';
for (const e of [
  'GetPoolCount()',
  'GetPoolPaths()',
  'GetFeeAmountTickSpacings()',
]) {
  console.log(e, await qeval(pool, e));
}

// common GetToken / IsRegistered for gns
const common = 'gno.land/r/gnoswap/common';
console.log('IsRegistered gns', await qeval(common, 'IsRegistered("gno.land/r/gnoswap/gns")'));

// grc20reg
const regPaths = await (async () => {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qpaths',
      data: Buffer.from('gno.land/r/demo').toString('base64'),
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
  return d ? Buffer.from(d, 'base64').toString() : j;
})();
console.log('demo paths sample', String(regPaths).split('\n').filter((p) => /wugnot|grc20|token|swap/i.test(p)).slice(0, 40));

// defi grc20reg on topaz
const defi = await (async () => {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qpaths',
      data: Buffer.from('gno.land/r/demo/defi').toString('base64'),
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
  return d ? Buffer.from(d, 'base64').toString() : j;
})();
console.log('defi', defi);

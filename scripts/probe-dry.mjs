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
  if (rb?.Error) return 'ERR: ' + (rb.Error?.value || JSON.stringify(rb.Error)).slice(0, 250);
  if (!rb?.Data) return 'empty';
  return Buffer.from(rb.Data, 'base64').toString();
}

async function qdoc(pkg) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'abci_query',
    params: {
      path: 'vm/qdoc',
      data: Buffer.from(pkg).toString('base64'),
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
  if (!d) return null;
  return JSON.parse(Buffer.from(d, 'base64').toString());
}

const wugnot = 'gno.land/r/gnoland/wugnot.wugnot';
const gns = 'gno.land/r/gnoswap/gns.GNS';
const usdc = 'gno.land/r/gnoswap/test_token/test_usdc.USDC';
const fee = '3000';
const amount = '1000000';

async function dry(a, b) {
  const route = `${a}:${b}:${fee}`;
  const expr = `gno.land/r/gnoswap/router.DrySwapRoute("${a}","${b}","${amount}","ExactIn","${route}","100","0")`;
  console.log(a.split('/').pop(), '->', b.split('/').pop(), await qeval(expr));
}

await dry(wugnot, gns);
await dry(gns, wugnot);
await dry(wugnot, usdc);
await dry(usdc, wugnot);

const wdoc = await qdoc('gno.land/r/gnoland/wugnot');
console.log(
  'wugnot funcs',
  wdoc?.funcs?.map((f) => f.name + (f.crossing ? '*' : '') + ' ' + (f.signature || '').slice(0, 80)).join('\n'),
);

const gdoc = await qdoc('gno.land/r/gnoswap/gns');
console.log(
  'gns funcs',
  gdoc?.funcs?.filter((f) => /Approve|Transfer|Balance|Deposit|Withdraw|Wrap|Unwrap/i.test(f.name)).map((f) => f.signature).join('\n'),
);

import React, { useCallback, useEffect, useState } from 'react';
import type { ExtState } from '../shared/messages';
import { ext, getState, shortAddr, ugnotToGnot } from './api';
import { BUILTIN_NETWORKS } from '@/config/networks';

type Page = 'home' | 'send' | 'receive' | 'settings' | 'onboard' | 'unlock' | 'seed';

export default function App() {
  const [state, setState] = useState<ExtState | null>(null);
  const [page, setPage] = useState<Page>('home');
  const [err, setErr] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [seedReveal, setSeedReveal] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      const s = await getState();
      setState(s);
      if (!s.hasVault) setPage('onboard');
      else if (!s.unlocked) setPage('unlock');
      else if (page === 'onboard' || page === 'unlock' || page === 'seed') setPage('home');
      setErr(undefined);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void refresh();
  }, []);

  if (loading && !state) {
    return (
      <div className="app">
        <p className="muted">Loading wallet…</p>
      </div>
    );
  }

  return (
    <div className="app">
      {err ? <div className="err">{err}</div> : null}

      {page === 'onboard' && (
        <Onboard
          onDone={async (phrase?) => {
            if (phrase) {
              setSeedReveal(phrase);
              setPage('seed');
            } else {
              await refresh();
              setPage('home');
            }
          }}
          onError={setErr}
        />
      )}

      {page === 'seed' && seedReveal && (
        <SeedBackup
          phrase={seedReveal}
          onDone={async () => {
            setSeedReveal(undefined);
            await refresh();
            setPage('home');
          }}
        />
      )}

      {page === 'unlock' && state && (
        <Unlock
          accounts={state.accounts}
          onDone={async () => {
            await refresh();
            setPage('home');
          }}
          onError={setErr}
        />
      )}

      {page === 'home' && state?.unlocked && (
        <>
          <Home state={state} onRefresh={refresh} onError={setErr} />
          <Nav page={page} setPage={setPage} />
        </>
      )}

      {page === 'send' && state?.unlocked && (
        <>
          <Send
            onDone={async () => {
              await refresh();
              setPage('home');
            }}
            onError={setErr}
          />
          <Nav page={page} setPage={setPage} />
        </>
      )}

      {page === 'receive' && state?.activeAccount && (
        <>
          <Receive address={state.activeAccount.address} />
          <Nav page={page} setPage={setPage} />
        </>
      )}

      {page === 'settings' && state && (
        <>
          <Settings state={state} onRefresh={refresh} onError={setErr} />
          <Nav page={page} setPage={setPage} />
        </>
      )}
    </div>
  );
}

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const items: { id: Page; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'send', label: 'Send' },
    { id: 'receive', label: 'Receive' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <div className="nav">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className={page === it.id ? 'active' : ''}
          onClick={() => setPage(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Onboard({
  onDone,
  onError,
}: {
  onDone: (phrase?: string) => void;
  onError: (e: string) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'create' | 'import'>('choose');
  const [name, setName] = useState('main');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [busy, setBusy] = useState(false);

  if (mode === 'choose') {
    return (
      <>
        <h1>Gno Wallet</h1>
        <p className="muted">Desktop extension for gno.land · Adena-compatible dApp connect.</p>
        <button type="button" className="btn btn-primary" onClick={() => setMode('create')}>
          Create new wallet
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setMode('import')}>
          Import seed phrase
        </button>
      </>
    );
  }

  const submit = async () => {
    onError('');
    if (password.length < 8) return onError('Password min 8 characters');
    if (password !== confirm) return onError('Passwords do not match');
    setBusy(true);
    try {
      if (mode === 'create') {
        const data = await ext<{ phrase: string }>({
          type: 'EXT_CREATE_WALLET',
          name,
          password,
        });
        onDone(data.phrase);
      } else {
        await ext({
          type: 'EXT_IMPORT_WALLET',
          name,
          mnemonic,
          password,
        });
        onDone();
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2>{mode === 'create' ? 'Create wallet' : 'Import wallet'}</h2>
      <label>Account name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      {mode === 'import' && (
        <>
          <label>Seed phrase (12/24 words)</label>
          <textarea value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} />
        </>
      )}
      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <label>Confirm password</label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      <button type="button" className="btn btn-primary" disabled={busy} onClick={submit}>
        {busy ? 'Working…' : mode === 'create' ? 'Create' : 'Import'}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setMode('choose')}>
        Back
      </button>
    </>
  );
}

function SeedBackup({ phrase, onDone }: { phrase: string; onDone: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <h2>Backup seed phrase</h2>
      <p className="muted">
        Write these words down offline. Anyone with this phrase can control your funds.
      </p>
      <div className="seed-box">{phrase}</div>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        I saved my seed phrase safely
      </label>
      <button type="button" className="btn btn-primary" disabled={!checked} onClick={onDone}>
        Continue
      </button>
    </>
  );
}

function Unlock({
  accounts,
  onDone,
  onError,
}: {
  accounts: { name: string; address: string }[];
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const [name, setName] = useState(accounts[0]?.name || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <h1>Unlock</h1>
      <p className="muted">Enter password to sign transactions this session.</p>
      <label>Account</label>
      <select value={name} onChange={(e) => setName(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.name} value={a.name}>
            {a.name} · {shortAddr(a.address)}
          </option>
        ))}
      </select>
      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          onError('');
          try {
            await ext({ type: 'EXT_UNLOCK', name, password });
            onDone();
          } catch (e) {
            onError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Unlocking…' : 'Unlock'}
      </button>
    </>
  );
}

function Home({
  state,
  onRefresh,
  onError,
}: {
  state: ExtState;
  onRefresh: () => void;
  onError: (e: string) => void;
}) {
  return (
    <>
      <div className="topbar">
        <div>
          <strong>{state.activeAccount?.name}</strong>
          <span className={state.unlocked ? 'badge' : 'badge warn'}>
            {state.unlocked ? 'Unlocked' : 'Locked'}
          </span>
        </div>
        <button type="button" className="btn btn-ghost" style={{ width: 'auto', margin: 0 }} onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="muted" style={{ marginBottom: 8 }}>
          {state.network.name} · {state.network.chainId}
        </div>
        <div className="balance">
          {ugnotToGnot(state.ugnot)}
          <span> GNOT</span>
        </div>
        <p className="addr" style={{ marginTop: 12 }}>
          {state.activeAccount?.address}
        </p>
      </div>
      <div className="card">
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>Assets</h2>
        {(state.coins.length ? state.coins : [{ symbol: 'GNOT', display: ugnotToGnot(state.ugnot), amount: state.ugnot, kind: 'native' }]).map(
          (c) => (
            <div key={c.symbol + c.amount} className="token-row">
              <span>{c.symbol}</span>
              <span>{c.display}</span>
            </div>
          ),
        )}
      </div>
      <p className="muted" style={{ fontSize: 11 }}>
        dApps: window.adena · balances only (no price oracle)
      </p>
    </>
  );
}

function Send({ onDone, onError }: { onDone: () => void; onError: (e: string) => void }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <h2>Send GNOT</h2>
      <label>To address (g1…)</label>
      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="g1…" />
      <label>Amount (GNOT)</label>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" />
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          onError('');
          try {
            await ext({ type: 'EXT_SEND', to, amountGnot: amount });
            onDone();
          } catch (e) {
            onError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Sending…' : 'Send'}
      </button>
    </>
  );
}

function Receive({ address }: { address: string }) {
  return (
    <>
      <h2>Receive</h2>
      <p className="muted">Share this address to receive GNOT / tokens on the selected network.</p>
      <div className="card">
        <p className="addr">{address}</p>
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => navigator.clipboard.writeText(address)}
      >
        Copy address
      </button>
    </>
  );
}

function Settings({
  state,
  onRefresh,
  onError,
}: {
  state: ExtState;
  onRefresh: () => void;
  onError: (e: string) => void;
}) {
  return (
    <>
      <h2>Settings</h2>
      <label>Network</label>
      <select
        value={state.network.id}
        onChange={async (e) => {
          try {
            await ext({ type: 'EXT_SWITCH_NETWORK', networkId: e.target.value });
            onRefresh();
          } catch (err) {
            onError(err instanceof Error ? err.message : String(err));
          }
        }}
      >
        {BUILTIN_NETWORKS.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name} ({n.chainId})
          </option>
        ))}
      </select>
      <div className="card">
        <div className="muted">Accounts</div>
        {state.accounts.map((a) => (
          <div key={a.name} className="token-row">
            <span>
              {a.name}
              <br />
              <span className="addr">{shortAddr(a.address)}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: 'auto' }}
              onClick={async () => {
                await ext({ type: 'EXT_SET_ACTIVE', name: a.name });
                onRefresh();
              }}
            >
              Use
            </button>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11 }}>
        Gno Wallet extension v0.1 · vault in chrome.storage · unlock required each browser session
      </p>
    </>
  );
}

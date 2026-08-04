import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { PendingApproval } from '../shared/messages';
import '../popup/styles.css';

function ApprovalApp() {
  const [item, setItem] = useState<PendingApproval | null>(null);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'APPROVAL_GET' }, (res) => {
      if (!res?.ok) {
        setErr(res?.error || 'No pending request');
        return;
      }
      setItem(res.data as PendingApproval | null);
      if (!res.data) setErr('No pending approval (already handled or expired).');
    });
  }, []);

  const resolve = (approved: boolean) => {
    if (!item) return;
    setBusy(true);
    chrome.runtime.sendMessage(
      { type: 'APPROVAL_RESOLVE', id: item.id, approved },
      () => {
        window.close();
      },
    );
  };

  return (
    <div className="app" style={{ maxWidth: 420, margin: '0 auto' }}>
      <h1>Approve request</h1>
      {err ? <div className="err">{err}</div> : null}
      {item?.kind === 'establish' && (
        <div className="card">
          <p className="muted">Connection request</p>
          <h2>{item.siteName}</h2>
          <p className="addr">{item.origin}</p>
          <p className="muted" style={{ marginTop: 12 }}>
            This site wants to see your address and request transactions. You will still approve each
            transaction.
          </p>
        </div>
      )}
      {item?.kind === 'contract' && (
        <div className="card">
          <p className="muted">Transaction · {item.origin}</p>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              background: '#111',
              padding: 12,
              borderRadius: 8,
            }}
          >
            {item.summary}
          </pre>
        </div>
      )}
      {item && (
        <div className="row">
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => resolve(false)}>
            Reject
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => resolve(true)}>
            Approve
          </button>
        </div>
      )}
      {!item && !err && <p className="muted">Loading…</p>}
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<ApprovalApp />);

# Product specification

## Vision

A self-custody wallet that is a practical way to use gno.land on phones and in the browser, with Adena-class basics and open contribution.

## Users

1. **Gnome on the go** — balances, send GNOT, approve a realm call  
2. **Builder** — switch testnets, call demo realms  
3. **Adena user** — import an existing mnemonic; same `g1…` address  

## Non-goals (v1)

- Multi-chain non-Gno assets  
- In-app DEX  
- Social / MPC login  
- Hardware wallet (later)  

## Requirements (summary)

### P0 — Core

- Create / import BIP39  
- Password vault  
- Home: address + live GNOT balance  
- Receive (QR / copy) + Send  
- Multi-network + multi-account  

### P1

- Local activity history  
- Custom / watched tokens  
- Realm call UI  
- Deep-link / GnoConnect scaffolding  

### P2

- NFT, Ledger, in-app dApp browser, multisig  

## Security checklist

- Never log mnemonics  
- Confirm seed backup during onboarding  
- Prefer testnets for public demos  

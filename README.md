# Testify: Verifiable Credentials on Hedera Testnet

**Testify** is the working implementation of the [Attestant](https://github.com/fidaaltf58/DDIB) Learn2Earn design. Issuers mint **XP and Reward tokens**, issue **soulbound credential NFTs**, and publish **outreach records** on the Hedera network. Candidates sign up with a real Hedera account and see their verified on-chain profile live in the browser.

Everything below runs against **Hedera testnet** using the Hiero SDK (Hedera Token Service + Hedera Consensus Service) and the public mirror node. There is no database: every profile is read live from the chain.

---

## Highlights

- **Real sign-up:** "Create my account" fires an `AccountCreateTransaction` on testnet. Signing up *is* how you get an account.
- **Account-ID identity:** sign in with an account ID only. No password or private key ever reaches the UI.
- **Soulbound credentials:** a credential is an HTS NFT whose metadata points at an HCS message (`topic:sequence:hash`). It is transferred to the candidate and then frozen.
- **Two-part verification:** content (the HCS record matches the hash) **and** possession (the account actually holds the NFT).
- **Transparent outreach:** "an organisation reached out" is an org-signed HCS message that anyone can query. It is not a private database row.
- **Live profile:** public key, HBAR balance, XP by issuer, credentials held, and Reward Token balance, all fetched from the mirror node on every load.

## Architecture

```
            ┌──────────────┐   HTTP    ┌───────────────────────────┐
 Browser ──►│   ui.html    │──────────►│ server.js (Node http)      │
            └──────────────┘           │  /api/signup  /api/profile │
                                       │  /api/credentials ...      │
                                       └──────┬───────────┬─────────┘
                                   Hiero SDK  │           │ REST
                                              ▼           ▼
                                   ┌────────────────┐ ┌──────────────────┐
                                   │ Hedera testnet │ │ Mirror node      │
                                   │  HTS · HCS     │ │ (public queries) │
                                   └────────────────┘ └──────────────────┘
```

## Prerequisites

- **Node.js 20.6+** (uses `node --env-file`)
- A **Hedera testnet account** with HBAR. Get one free at the [Hedera Portal](https://portal.hedera.com).

## Setup

```bash
git clone https://github.com/fidaaltf58/testify.git
cd testify
npm install
cp .env.example .env
```

Fill in `.env` (it is git-ignored, so it never gets committed). End the file with a trailing newline so that appending to it later doesn't corrupt the last line.

```env
HEDERA_ACCOUNT_ID=0.0.xxxxxxx        # operator / issuer account
HEDERA_PRIVATE_KEY=0x...             # operator private key
TOPIC_ID=0.0.xxxxxxx                 # HCS topic (credentials, outreach, issuer registry)
XP_TOKEN_ID=0.0.xxxxxxx
REWARD_TOKEN_ID=0.0.xxxxxxx
CREDENTIAL_TOKEN_ID=0.0.xxxxxxx
CANDIDATE_ACCOUNT_ID=0.0.xxxxxxx
PORT=3000
```

Fill in the IDs as you run the bootstrap scripts below. Each script prints the ID it creates.

## Bootstrap the on-chain objects

```bash
node --env-file=.env create-account.js                 # issuer account + HCS topic → TOPIC_ID
node --env-file=.env register-issuer-key.js            # publish the issuer key to the HCS registry
node --env-file=.env create-xp-token.js                # fungible XP token (FSXP) → XP_TOKEN_ID
node --env-file=.env create-reward-token.js            # fungible Reward Token (FSRWD) → REWARD_TOKEN_ID
node --env-file=.env create-candidate-account.js       # candidate/holder account → CANDIDATE_ACCOUNT_ID
node --env-file=.env create-credential-collection.js   # credential NFT collection → CREDENTIAL_TOKEN_ID
node --env-file=.env mint-xp.js 50                     # mint XP
node --env-file=.env mint-reward.js 220 <accountId>    # mint Reward Tokens to an account
node --env-file=.env issue-credential.js "Backend Bootcamp — Advanced Track"
node --env-file=.env verify-credential.js <tokenId> 1  # content + possession check
```

## Run the app

```bash
npm start            # same as: node --env-file=.env server.js
```

Open **<http://localhost:3000>**:

- **Create my account** creates a brand-new testnet account and drops you into an empty profile.
- **I already have an account** signs in with an existing account ID, such as the demo candidate `0.0.9670797` or the demo issuer `0.0.9433965`.

> If the panels show "live fetch failed", you opened `ui.html` directly as a file. Open it through `server.js`.

### Watch activity in real time

```bash
npm run listen       # subscribes to the topic and prints messages as they land
```

### Log an outreach record

```bash
node --env-file=.env outreach.js 0.0.9670797 "Junior Backend Engineer"
```

The mirror node has a few seconds of ingestion lag. If a freshly logged record doesn't show up right away, wait about 5 seconds.

## HTTP API (`server.js`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/signup` | Create a new Hedera testnet account |
| `GET` | `/api/profile?accountId=` | Public key, HBAR balance, and tokens held |
| `GET` | `/api/credentials?accountId=&tokenId=` | Every credential the account actually holds |
| `GET` | `/api/credential?tokenId=&serial=` | Verify one credential (content + possession) |
| `GET` | `/api/outreach?accountId=` | Org-signed outreach records for a candidate |

## Files

| File | Purpose |
|---|---|
| `ui.html` | Product UI: sign-up/sign-in, identity pill, live panels (the rest is still mock data) |
| `server.js` | Plain Node `http` server that serves the UI and the `/api/*` endpoints |
| `signup.js` | Creates a new Hedera account on demand |
| `profile.js` | Builds a profile from the mirror node |
| `verify-credential.js` | Content + possession verification, plus `getCredentialsFor(accountId)` |
| `outreach.js` | Publishes and reads org-signed outreach records |
| `create-account.js` | Creates the operator/issuer account and the HCS topic |
| `create-candidate-account.js` | Creates the candidate/holder account |
| `register-issuer-key.js` / `resolve-issuer-key.js` | Publish and resolve an issuer key on the HCS registry |
| `create-xp-token.js` / `mint-xp.js` | Fungible XP token |
| `create-reward-token.js` / `mint-reward.js` | Fungible Reward Token: spendable and intentionally *not* soulbound |
| `create-credential-collection.js` | HTS NFT collection for credentials |
| `issue-credential.js` | Marshal, submit to HCS, mint the NFT, transfer it, then freeze it (soulbound) |
| `submit-message.js` | Generic HCS message examples |
| `listener.js` | Live topic subscriber |

## Explore on HashScan

| Object | Link |
|---|---|
| HCS topic (credentials, outreach, registry) | <https://hashscan.io/testnet/topic/0.0.9512087> |
| XP token | <https://hashscan.io/testnet/token/0.0.9668662> |
| Credential collection | <https://hashscan.io/testnet/token/0.0.9671209> |
| Demo candidate account | <https://hashscan.io/testnet/account/0.0.9670797> |

## Implementation notes

- **`freezeDefault: false` on the credential collection.** With `freezeDefault: true`, an auto-created token association starts frozen and the first delivery is rejected. The fix is to create the collection unfrozen, transfer, then freeze immediately. The result is still soulbound.
- **Signup keys.** Signup currently generates a key server-side, uses it to satisfy `setKey()`, and then discards it. That is acceptable only while no feature needs the candidate's own signature.

## Status

| Piece | Status |
|---|---|
| Sign-up / sign-in, identity pill | ✅ Real |
| Testnet accounts (issuer, candidate, every sign-up) | ✅ Real |
| HCS registry topic + issuer key registration/resolution | ✅ Real |
| XP Token (`FSXP`), Reward Token (`FSRWD`) | ✅ Real (no reserve pool or redemption yet) |
| Credential NFT, issued and verified end to end | ✅ Real |
| Outreach records | ✅ Real |
| Profile / Credentials / Outreach APIs | ✅ Real (live mirror node queries) |
| Second issuer's wallet balance, job board, courses, employment events, governance, search | 🟡 Mock |
| Reputation Credentials, Impact Certificates | ⏳ Not on testnet yet |
| Reserve pool, redemption, revocation, DAO voting | ⏳ Designed, not implemented |

## Roadmap

1. **Non-custodial key handoff:** generate keys client-side and hand them over once, before building any feature that needs the candidate's signature (for example, accepting an employment event).
2. **Separate issuer signing from the operator:** the issuer signs locally and only hands signed bytes to the operator.
3. **Reputation Credentials / endorsements:** reuse the `outreach.js` pattern for signed endorsements.
4. **Wire up the wallet and job board:** the wallet needs the reserve pool, and the job board needs real predicate evaluation against holdings.
5. **Revocation:** use the collection's wipe key and confirm that `verify-credential.js` reports the credential as invalid.
6. **Reserve pool / Reward Token redemption contract:** pending a group decision on FX handling.

## Related

- **[DDIB / Attestant](https://github.com/fidaaltf58/DDIB)**: landing page and full product UI design.

## Author

**Fidaa Letaief** · [@fidaaltf58](https://github.com/fidaaltf58)

# Testify — what's in this folder

Everything for the project in one place: the UI, the backend scripts, and
the real Hedera testnet activity behind it. Below is what each file is,
how to run it, and exactly how to see the progress yourself.

## How to see it working right now

```
cd testify
node --env-file=..\.env server.js
```

Then open **http://localhost:3000** — you'll land on a **sign-in screen**,
not the app directly.

**Click "Create my account"** and a real `AccountCreateTransaction` fires
against Hedera testnet on the spot — no account ID needed beforehand,
because signing up *is* how you get one. A couple seconds later you're
dropped straight into the app as that brand new account, correctly showing
zero XP, zero credentials, zero outreach — honestly empty, since it's real
and just created.

To see one that already has history instead, click **"I already have an
account"** and use one of the two demo IDs:
- `0.0.9670797` — the candidate side, holds a real credential
- `0.0.9433965` — the organisation/issuer side, holds real XP

No password, no private key ever touches this screen either way — that's
the whole point of the account-ID-only identity model. Once connected,
these are live, fetched fresh from testnet on every load, not mock:

- **The account pill in the sidebar** — shows the real connected account ID
  and its real public key (truncated), always visible. Click it, or the
  "Copy public key" button on the Dashboard, to copy the full key.
- **"XP by issuer"** — the Fenwick Systems row shows a real balance for
  whoever's signed in, with a **live** badge.
- **Credentials** — queries which credentials *this specific account*
  actually holds (not a hardcoded one) and shows the real HCS/HTS data.
- **"Organisations that reached out"** — a real, on-chain record. Not a
  claim the org gets to make privately; anyone can independently verify it
  the same way this page does (see "blockchain transparency" below).
- **Wallet balance** — the Fenwick Systems portion is real (a real Reward
  Token, `FSRWD`, minted to whoever's signed in); the Cape Town Digital
  Trust portion stays honestly marked mock, since no second issuer's
  Reward Token exists on testnet yet.

If any of these show "live fetch failed," the page was opened directly as
a file instead of through `server.js`.

**To watch it happen in real time**, open a second terminal in this same
folder and run `node --env-file=..\.env listener.js`, then re-run one of
the issuing scripts below in a third terminal.

**To see the raw testnet objects directly:**
- Topic (credentials + outreach + registry, all on one topic): `https://hashscan.io/testnet/topic/0.0.9512087`
- XP Token: `https://hashscan.io/testnet/token/0.0.9668662`
- Credential collection: `https://hashscan.io/testnet/token/0.0.9671209`
- Candidate account: `https://hashscan.io/testnet/account/0.0.9670797`

## Blockchain transparency, concretely: outreach

"Did an organisation reach out to this candidate" isn't a field in a
database an org could quietly falsify — it's an HCS message, org-signed,
timestamped, permanent, and queryable by anyone:

```
node --env-file=..\.env outreach.js 0.0.9670797 "Junior Backend Engineer"
```

This publishes a real record and reads it straight back via the public
mirror node. The candidate sees it on their Dashboard; so would anyone
else who ran the same query. That's the actual mechanism — not a UI
promise.

One real operational thing this surfaced: the mirror node has a few
seconds of ingestion lag after a message is submitted. If you log outreach
and immediately query it back in the same script run, it can show 0
results for a moment — that's propagation delay, not a bug. Wait ~5
seconds and it's there.

## How the credential got issued (already run, real)

```
node --env-file=..\.env create-candidate-account.js       # → 0.0.9670797, the "person using the platform"
node --env-file=..\.env create-credential-collection.js   # → 0.0.9671209, the certificate side
node --env-file=..\.env issue-credential.js
node verify-credential.js 0.0.9671209 1
```

`CREDENTIAL_TOKEN_ID` and `CANDIDATE_ACCOUNT_ID` are now saved in `..\.env`,
so nothing needs to be passed inline anymore — this is the two sides you
asked for: an issuer/certificate side (the collection + the signing/minting
flow) and a candidate/holder side (a real second account that actually
received it, soulbound).

## What each file is

| File | What it does |
|---|---|
| `ui.html` | The product UI. Sign-up/sign-in screen, then a persistent identity pill, plus live-wired panels (above); everything else is still realistic mock data. |
| `server.js` | Node HTTP server — serves `ui.html`, exposes `/api/signup`, `/api/profile`, `/api/credentials`, `/api/credential`, `/api/outreach`. No framework. |
| `signup.js` | Creates a brand new Hedera account for real, on demand — the actual "sign up" mechanism, not account-ID entry. |
| `profile.js` | Builds a profile from the mirror node: public key, HBAR balance, every token held. |
| `verify-credential.js` | The two-part verification check (content + possession), plus `getCredentialsFor(accountId)` — finds every credential an account actually holds, no hardcoded serial. |
| `outreach.js` | Publishes and reads back real outreach records — org-signed, candidate-visible, no counter-signature required (see the earlier design note on why). |
| `create-account.js` | Creates the operator/issuer testnet account. |
| `create-candidate-account.js` | Creates the candidate/holder testnet account. |
| `register-issuer-key.js` / `resolve-issuer-key.js` | Publish and resolve an issuer's key on the HCS registry topic. |
| `create-xp-token.js` / `mint-xp.js` | Create and mint the fungible XP token. |
| `create-reward-token.js` / `mint-reward.js` | Create and mint the fungible Reward Token (`FSRWD`) — spendable, deliberately not soulbound. Reserve pool / redemption still deliberately not built (open group decision). |
| `create-credential-collection.js` | Creates the HTS NFT collection credentials get minted into. `freezeDefault: false` — see the note below. |
| `issue-credential.js` | marshal → submit to HCS → mint NFT (metadata = topic:sequence:hash) → transfer → freeze (soulbound). |
| `submit-message.js` | Generic HCS message examples. |
| `listener.js` | Subscribes live to the topic, prints messages as they land. |

**One real Hedera constraint worth remembering:** the credential collection
uses `freezeDefault: false`, not `true` like the XP token. `freezeDefault: true`
blocks the very first delivery to an account — an auto-created association
starts frozen, so the transfer that would create it gets rejected. Fix:
create unfrozen, transfer, freeze immediately after. Same soulbound result.

**Another real one from this session:** `.env` had no trailing newline, so
a plain `echo ... >> .env` silently concatenated onto the last line instead
of starting a new one — corrupted `TOPIC_ID` for a few minutes until caught
and fixed. If you ever append to `.env` by hand, check it ends with a
newline first.

## What's real vs. what's still a mockup

| Piece | Status |
|---|---|
| Sign-up (creates a real account on the spot) | Real — `POST /api/signup` fires an actual `AccountCreateTransaction` |
| Sign-in with an existing account ID | Real, secondary path |
| Persistent identity pill (account ID + public key) | Real — live for whoever signs in |
| Hedera testnet accounts (issuer + candidate + every signup) | Real |
| HCS registry topic + issuer key registration/resolution | Real |
| XP Token (`FSXP`) | Real |
| Reward Token (`FSRWD`) | Real — created and minted, but no reserve pool / redemption logic yet |
| Credential NFT, issued and verified end to end | Real — content + possession, both independently checked |
| Outreach record ("organisation reached out") | Real — org-signed HCS message, publicly queryable |
| Profile / Credentials / Outreach APIs | Real — live mirror node queries, no database |
| Wallet balance (Fenwick portion) | Real — live FSRWD balance for whoever's signed in |
| Wallet balance (Cape Town portion), redemption flow, Job board, Courses, Employment events, Governance, Search, Pool & keys | Mock |
| Reputation Credentials, Impact Certificates | Not created on testnet yet |
| Reserve pool, redemption, revocation-in-practice, DAO voting | Designed, no on-chain implementation yet |

## Honest next steps, in order

1. **Real non-custodial key handoff.** Signup generates a key server-side to satisfy Hedera's `setKey()` requirement, then discards it — nobody holds it, including the user. That's fine *only* because nothing built so far needs the candidate to sign anything themselves (delivery is entirely issuer-driven). The moment a feature needs the candidate's own signature — accepting an employment event is the first one on the roadmap — this has to become real: generate client-side, hand over once, never let it touch the server. Don't build that feature before this one.
2. **Separate issuer signing from the Operator account.** The operator key stands in as the issuer for this demo — the real design has the issuer sign locally and only hand signed bytes to the Operator. This is the actual trust boundary the whole system depends on.
3. **Reputation Credentials / endorsements** — the "vouches for him" half of this request isn't built yet, only outreach is. Same pattern (`outreach.js`) would extend to a signed endorsement record.
4. **Wire Wallet and Job board next** — same live-fetch pattern, but Wallet needs the reserve pool piece (still open) and Job board needs real predicate evaluation against real holdings.
5. **Revocation, for real** — call the wipe key on the credential collection, confirm `verify-credential.js` correctly reports it as invalid.
6. **The reserve pool / Reward Token redemption contract** is still the one piece flagged as genuinely open in the spec — don't build it ahead of the group's decision on Reward Token FX handling.

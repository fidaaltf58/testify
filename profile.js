// The "profile" endpoint, for real: not stored anywhere, assembled live
// from the public mirror node — same source verification uses, so what a
// candidate sees here is what anyone else independently checking them sees.

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

async function getAccount(accountId) {
  const res = await fetch(`${MIRROR}/accounts/${accountId}`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status} for account ${accountId}`);
  return res.json();
}

async function getTokenBalances(accountId) {
  const res = await fetch(`${MIRROR}/accounts/${accountId}/tokens?limit=50`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status} for token balances`);
  const { tokens } = await res.json();
  return tokens;
}

async function getTokenInfo(tokenId) {
  const res = await fetch(`${MIRROR}/tokens/${tokenId}`);
  if (!res.ok) return { name: tokenId, symbol: tokenId, type: "UNKNOWN" };
  return res.json();
}

async function buildProfile(accountId) {
  const [account, balances] = await Promise.all([
    getAccount(accountId),
    getTokenBalances(accountId),
  ]);

  const tokensWithInfo = await Promise.all(
    balances.map(async (b) => {
      const info = await getTokenInfo(b.token_id);
      return {
        tokenId: b.token_id,
        name: info.name,
        symbol: info.symbol,
        type: info.type,
        balance: b.balance,
      };
    })
  );

  return {
    accountId,
    publicKey: account.key ? account.key.key : null,
    evmAddress: account.evm_address,
    hbarBalance: account.balance ? account.balance.balance / 1e8 : 0,
    tokens: tokensWithInfo,
  };
}

function printProfile(profile) {
  console.log(`\nProfile — ${profile.accountId}`);
  console.log(`  HBAR balance: ${profile.hbarBalance}`);
  if (profile.tokens.length === 0) {
    console.log(`  No token holdings yet.`);
    return;
  }
  console.log(`  Holdings:`);
  for (const t of profile.tokens) {
    const label = t.type === "NON_FUNGIBLE_UNIQUE" ? "NFT" : "fungible";
    console.log(`    - ${t.name || t.tokenId} (${t.symbol || "?"}) [${label}]  balance: ${t.balance}`);
  }
}

async function main() {
  const accountId = process.argv[2] || process.env.HEDERA_ACCOUNT_ID;
  if (!accountId) throw new Error("Pass an account ID, or set HEDERA_ACCOUNT_ID in .env");

  const profile = await buildProfile(accountId);
  printProfile(profile);
}

module.exports = { buildProfile };

// Only run as a CLI script when invoked directly (`node profile.js ...`) —
// not when server.js requires this file for the /api/profile route.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

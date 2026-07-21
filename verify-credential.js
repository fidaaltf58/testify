const crypto = require("crypto");

// The two-part verification check, for real. Both halves query the public
// mirror node — nothing here trusts the Operator, a database, or Testify's
// own servers. Anyone can independently run this exact script.

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

async function verifyCredential(credentialTokenId, serial) {
  // Part 1 — possession: does the NFT still exist and who holds it right now?
  const nftRes = await fetch(`${MIRROR}/tokens/${credentialTokenId}/nfts/${serial}`);
  if (!nftRes.ok) {
    return { valid: false, reason: `NFT not found (status ${nftRes.status}) — likely wiped/revoked` };
  }
  const nft = await nftRes.json();
  const currentHolder = nft.account_id;
  const [topicId, sequenceNumber, hashPrefix] = Buffer.from(nft.metadata, "base64").toString("utf8").split(":");

  // Part 2 — content: fetch the actual credential from HCS, verify integrity
  const msgRes = await fetch(`${MIRROR}/topics/${topicId}/messages/${sequenceNumber}`);
  if (!msgRes.ok) {
    return { valid: false, reason: `HCS message not found — content proof missing` };
  }
  const msg = await msgRes.json();
  const contentBytes = Buffer.from(msg.message, "base64");
  const payload = JSON.parse(contentBytes.toString("utf8"));
  const actualHash = crypto.createHash("sha256").update(contentBytes).digest("hex").slice(0, 16);

  const hashMatches = actualHash === hashPrefix;

  return {
    valid: hashMatches,
    currentHolder,
    hashMatches,
    payload,
    hcs: { topicId, sequenceNumber, consensusTimestamp: msg.consensus_timestamp },
  };
}

// Given a signed-in account, find every credential *it actually holds* —
// no hardcoded serial. This is what "sign in and see your real
// credentials" has to be built on, not one fixed demo NFT.
async function getCredentialsFor(accountId, credentialTokenId) {
  const res = await fetch(`${MIRROR}/accounts/${accountId}/nfts?token.id=${credentialTokenId}`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status} for account NFTs`);
  const { nfts } = await res.json();

  return Promise.all(
    nfts.map((n) => verifyCredential(credentialTokenId, n.serial_number))
  );
}

async function main() {
  const credentialTokenId = process.argv[2] || process.env.CREDENTIAL_TOKEN_ID;
  const serial = process.argv[3] || "1";
  if (!credentialTokenId) throw new Error("Usage: node verify-credential.js <tokenId> <serial>");

  const result = await verifyCredential(credentialTokenId, serial);

  console.log(`\nVerifying ${credentialTokenId} #${serial}`);
  if (!result.valid) {
    console.log(`  INVALID — ${result.reason || "content hash mismatch"}`);
    return;
  }
  console.log(`  Content proof (HCS):`);
  console.log(`    title:      ${result.payload.title}`);
  console.log(`    issuer:     ${result.payload.issuer}`);
  console.log(`    subject:    ${result.payload.subject}`);
  console.log(`    issuedAt:   ${result.payload.issuedAt}`);
  console.log(`    seq #${result.hcs.sequenceNumber} @ ${result.hcs.consensusTimestamp}`);
  console.log(`    content hash matches NFT metadata: ${result.hashMatches}`);
  console.log(`  Possession proof (HTS):`);
  console.log(`    currently held by: ${result.currentHolder}`);
  console.log(`  VALID`);
}

module.exports = { verifyCredential, getCredentialsFor };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

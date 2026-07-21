// Phase 1, read side: resolve an issuer's key by scanning the registry topic
// via the public testnet mirror node — never the consensus node, never an
// Operator database. This is the actual mechanism behind "the Operator
// isn't a trust dependency for verification."

async function resolveIssuerKey(topicId, issuerId) {
  const url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100&order=desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
  const { messages } = await res.json();

  for (const m of messages) {
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(m.message, "base64").toString("utf8"));
    } catch {
      continue; // not every message on this topic is a registry entry
    }
    if (decoded.type === "issuer_key_registration" && decoded.issuerId === issuerId) {
      return {
        ...decoded,
        consensusTimestamp: m.consensus_timestamp,
        sequenceNumber: m.sequence_number,
      };
    }
  }
  return null;
}

async function main() {
  const topicId = process.env.TOPIC_ID;
  if (!topicId) throw new Error("Set TOPIC_ID in .env first");

  const issuerId = process.argv[2] || "0.0.771120";
  const entry = await resolveIssuerKey(topicId, issuerId);

  if (!entry) {
    console.log(`No registration found for issuer ${issuerId} on topic ${topicId}`);
    return;
  }
  console.log(`Resolved issuer ${issuerId}`);
  console.log(`  publicKey:  ${entry.publicKey}`);
  console.log(`  validFrom:  ${entry.validFrom}`);
  console.log(`  seq #${entry.sequenceNumber} @ ${entry.consensusTimestamp}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

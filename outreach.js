const {
  AccountId,
  PrivateKey,
  Client,
  TopicMessageSubmitTransaction,
} = require("@hiero-ledger/sdk");

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

// Org-signed only, deliberately — see the design note from earlier:
// outreach doesn't mint or gate any asset, so it doesn't need the
// candidate's counter-signature to be valid proof. It just needs to be
// visible to the candidate, so a false claim is checkable, not undetectable.

async function logOutreach(client, topicId, { organisation, candidate, postingRef }) {
  const message = JSON.stringify({
    schemaVersion: 1,
    type: "outreach_record",
    organisation,
    candidate,
    postingRef: postingRef || null,
    timestamp: new Date().toISOString(),
  });

  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);
  const receipt = await tx.getReceipt(client);
  return { sequenceNumber: receipt.topicSequenceNumber.toString() };
}

// Read side — anyone can run this, not just the candidate or the Operator.
async function getOutreachFor(topicId, candidateId) {
  const res = await fetch(`${MIRROR}/topics/${topicId}/messages?limit=100&order=desc`);
  if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
  const { messages } = await res.json();

  const records = [];
  for (const m of messages) {
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(m.message, "base64").toString("utf8"));
    } catch {
      continue;
    }
    if (decoded.type === "outreach_record" && decoded.candidate === candidateId) {
      records.push({ ...decoded, sequenceNumber: m.sequence_number, consensusTimestamp: m.consensus_timestamp });
    }
  }
  return records;
}

async function main() {
  const topicId = process.env.TOPIC_ID;
  if (!topicId) throw new Error("Set TOPIC_ID in .env");
  const [, , candidateId, postingRef] = process.argv;
  if (!candidateId) throw new Error("Usage: node outreach.js <candidateAccountId> [postingRef]");

  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
  const client = Client.forTestnet().setOperator(accountId, privateKey);

  try {
    const result = await logOutreach(client, topicId, {
      organisation: accountId.toString(),
      candidate: candidateId,
      postingRef,
    });
    console.log(`Outreach logged — seq #${result.sequenceNumber}`);

    const records = await getOutreachFor(topicId, candidateId);
    console.log(`\n${candidateId} has ${records.length} outreach record(s):`);
    records.forEach((r) => console.log(`  - from ${r.organisation} re: ${r.postingRef || "(no posting ref)"} at ${r.timestamp}`));
  } finally {
    client.close();
  }
}

module.exports = { getOutreachFor };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

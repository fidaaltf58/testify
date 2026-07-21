const crypto = require("crypto");
const {
  AccountId,
  PrivateKey,
  Client,
  TopicMessageSubmitTransaction,
} = require("@hiero-ledger/sdk");

async function submit(client, topicId, message) {
  const txResponse = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);

  const receipt = await txResponse.getReceipt(client);
  console.log(`Seq #${receipt.topicSequenceNumber.toString()} | ${receipt.status.toString()} | ${message.slice(0, 60)}`);
}

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    const topicId = process.env.TOPIC_ID;
    if (!topicId) throw new Error("Set TOPIC_ID in .env first");

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    // 1. Plain text
    await submit(client, topicId, "hello HCS!");

    // 2. JSON payload
    const event = { user: "Fid", action: "login", ts: new Date().toISOString() };
    await submit(client, topicId, JSON.stringify(event));

    // 3. SHA-256 hash (proof-of-existence: data stays off-chain, fingerprint on-chain)
    const hash = crypto.createHash("sha256").update("secret off-chain data").digest("hex");
    await submit(client, topicId, JSON.stringify({ type: "sha256", hash }));
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();
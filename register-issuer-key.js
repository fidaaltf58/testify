const {
  AccountId,
  PrivateKey,
  Client,
  TopicMessageSubmitTransaction,
} = require("@hiero-ledger/sdk");

// Phase 1 of the backend build order: the key registry.
// An issuer publishes {issuerId, publicKey, validFrom} to a shared HCS topic.
// This is what verification resolves against later — never an Operator database.

async function registerIssuerKey(client, topicId, issuer) {
  const message = JSON.stringify({
    schemaVersion: 1,
    type: "issuer_key_registration",
    issuerId: issuer.issuerId,
    publicKey: issuer.publicKey,
    validFrom: new Date().toISOString(),
  });

  const txResponse = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);

  const receipt = await txResponse.getReceipt(client);
  return {
    sequenceNumber: receipt.topicSequenceNumber.toString(),
    status: receipt.status.toString(),
    transactionId: txResponse.transactionId.toString(),
  };
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

    // Sample issuer registering its key — in the real flow this is the
    // issuer's own key, signed and submitted by them, not the Operator.
    const issuer = {
      issuerId: "0.0.771120",
      publicKey: privateKey.publicKey.toStringDer(),
    };

    const result = await registerIssuerKey(client, topicId, issuer);
    console.log(`Registered issuer ${issuer.issuerId}`);
    console.log(`Seq #${result.sequenceNumber} | ${result.status} | tx ${result.transactionId}`);
    console.log(`Topic: ${topicId}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

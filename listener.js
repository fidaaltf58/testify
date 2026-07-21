const {
  AccountId,
  PrivateKey,
  Client,
  TopicMessageQuery,
  TopicId,
} = require("@hiero-ledger/sdk");

function main() {
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
  const topicId = process.env.TOPIC_ID;
  if (!topicId) throw new Error("Set TOPIC_ID in .env first");

  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  console.log(`Listening on topic ${topicId} ... (Ctrl+C to stop)`);

  new TopicMessageQuery()
    .setTopicId(TopicId.fromString(topicId))
    .setStartTime(0) // replay full topic history, then stream live
    .subscribe(
      client,
      (message, error) => {
        if (error) console.error("Stream error:", error);
      },
      (message) => {
        const contents = Buffer.from(message.contents).toString("utf-8");
        console.log(`#${message.sequenceNumber.toString()} @ ${message.consensusTimestamp.toDate().toISOString()}`);
        console.log(`   ${contents}`);
      }
    );
}

main();
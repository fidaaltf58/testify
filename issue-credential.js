const crypto = require("crypto");
const {
  AccountId,
  PrivateKey,
  Client,
  TopicMessageSubmitTransaction,
  TokenMintTransaction,
  TokenFreezeTransaction,
  TransferTransaction,
  NftId,
  TokenId,
} = require("@hiero-ledger/sdk");

// The real Credential SDK flow, end to end:
//   1. marshal the credential fields
//   2. sign + submit the full payload to HCS   (content proof)
//   3. mint an NFT whose metadata points back at that HCS message,
//      plus a hash of the content for tamper-evidence
//   4. unfreeze -> transfer -> freeze          (possession proof, soulbound)
//
// In production the issuer signs step 2 locally, never through the
// Operator. Here the operator account is standing in as the issuer for
// the demo — that boundary is a real thing to build next, not faked here.

async function issueCredential(client, { topicId, credentialTokenId, issuerId, subjectId, title }) {
  const payload = {
    schemaVersion: 1,
    type: "course_credential",
    issuer: issuerId,
    subject: subjectId,
    title,
    issuedAt: new Date().toISOString(),
  };
  const payloadBytes = Buffer.from(JSON.stringify(payload));
  const contentHash = crypto.createHash("sha256").update(payloadBytes).digest("hex");

  // Step 2 — publish the full, self-contained content to HCS
  const submitTx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(payloadBytes)
    .execute(client);
  const submitReceipt = await submitTx.getReceipt(client);
  const sequenceNumber = submitReceipt.topicSequenceNumber.toString();

  // Step 3 — mint the NFT: metadata is a pointer (topic:sequence) + a hash,
  // not the payload itself (100-byte metadata cap on HTS NFTs)
  const metadata = Buffer.from(`${topicId}:${sequenceNumber}:${contentHash.slice(0, 16)}`);
  const mintTx = await new TokenMintTransaction()
    .setTokenId(credentialTokenId)
    .setMetadata([metadata])
    .execute(client);
  const mintReceipt = await mintTx.getReceipt(client);
  const serial = mintReceipt.serials[0].toString();

  // Step 4 — deliver, then soulbind. The collection is created with
  // freezeDefault: false so the recipient's auto-association (from
  // maxAutomaticTokenAssociations) can actually receive the deposit; the
  // freeze that makes it soulbound happens immediately afterward. The only
  // party who could exploit that brief gap is the freeze-key holder itself
  // (the issuer), who is also the one running this whole sequence.
  const treasuryId = client.operatorAccountId;
  const nftId = new NftId(TokenId.fromString(credentialTokenId), serial);

  await (await new TransferTransaction()
    .addNftTransfer(nftId, treasuryId, subjectId)
    .execute(client)).getReceipt(client);

  await (await new TokenFreezeTransaction()
    .setTokenId(credentialTokenId)
    .setAccountId(subjectId)
    .execute(client)).getReceipt(client);

  return { topicId, sequenceNumber, contentHash, credentialTokenId, serial, payload };
}

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    const topicId = process.env.TOPIC_ID;
    const credentialTokenId = process.env.CREDENTIAL_TOKEN_ID;
    const candidateId = process.env.CANDIDATE_ACCOUNT_ID;
    if (!topicId) throw new Error("Set TOPIC_ID in .env");
    if (!credentialTokenId) throw new Error("Set CREDENTIAL_TOKEN_ID in .env (run create-credential-collection.js)");
    if (!candidateId) throw new Error("Set CANDIDATE_ACCOUNT_ID in .env (run create-candidate-account.js)");

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const result = await issueCredential(client, {
      topicId,
      credentialTokenId,
      issuerId: accountId.toString(),
      subjectId: candidateId,
      title: process.argv[2] || "Backend Bootcamp — Advanced Track",
    });

    console.log(`Credential issued and soulbound to ${candidateId}`);
    console.log(`  HCS:   topic ${result.topicId}, sequence #${result.sequenceNumber}`);
    console.log(`  NFT:   ${result.credentialTokenId} serial ${result.serial}`);
    console.log(`  hash:  ${result.contentHash}`);
    console.log(`  title: ${result.payload.title}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

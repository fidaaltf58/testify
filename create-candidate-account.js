const {
  AccountId,
  PrivateKey,
  Client,
  AccountCreateTransaction,
  Hbar,
} = require("@hiero-ledger/sdk");

// The "person using the platform" side — a second real testnet account,
// separate from the operator/issuer account, so credential delivery can
// actually be demoed as issuer -> someone else, not issuer -> itself.
// maxAutomaticTokenAssociations is set high per the Q1 decision: no manual
// TokenAssociateTransaction should ever block a candidate receiving something.

async function main() {
  let client;
  try {
    const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    const candidateKey = PrivateKey.generateECDSA();

    const tx = await new AccountCreateTransaction()
      .setKey(candidateKey.publicKey)
      .setInitialBalance(new Hbar(5))
      .setMaxAutomaticTokenAssociations(100)
      .execute(client);

    const receipt = await tx.getReceipt(client);
    const candidateId = receipt.accountId.toString();

    console.log(`Candidate account created: ${candidateId}`);
    console.log(`Add to .env: CANDIDATE_ACCOUNT_ID=${candidateId}`);
    console.log(`(private key generated but not needed for this demo — the`);
    console.log(` issuer/operator holds the freeze key and does the`);
    console.log(` unfreeze -> transfer -> freeze sequence, not the candidate)`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

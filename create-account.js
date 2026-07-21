const {
    AccountId,
    PrivateKey,
    Client,
    AccountCreateTransaction,
    Hbar,
    TopicCreateTransaction
  } = require("@hiero-ledger/sdk"); // v2.85.0

async function main() {
  let client;
  try {
    // Your account ID and private key from string value
    const MY_ACCOUNT_ID = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    // Pre-configured client for testnet
    client = Client.forTestnet();

    // Set the operator with the account ID and private key
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    // ---------------- Create a new account ----------------

    // Generate a new key for the account
    const accountPrivateKey = PrivateKey.generateECDSA();
    const accountPublicKey = accountPrivateKey.publicKey;

    const txCreateAccount = new AccountCreateTransaction()
      .setECDSAKeyWithAlias(accountPublicKey) // Sets the EVM Address from the public key (recommended)
      .setInitialBalance(new Hbar(10));

    // Sign with the operator key and submit to the Hedera network
    const txCreateAccountResponse = await txCreateAccount.execute(client);

    // Request the receipt of the transaction
    const receiptCreateAccountTx = await txCreateAccountResponse.getReceipt(client);

    // Get the transaction consensus status
    const statusCreateAccountTx = receiptCreateAccountTx.status;

    // Get the new Account ID
    const accountId = receiptCreateAccountTx.accountId;

    // Get the Transaction ID
    const txIdAccountCreated = txCreateAccountResponse.transactionId.toString();

    // Query the mirror node for the on-chain EVM address
    let accountEvmAddress;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const mirrorResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId.toString()}`
    );
    if (mirrorResponse.ok) {
      const mirrorData = await mirrorResponse.json();
      accountEvmAddress = mirrorData.evm_address;
    }

    console.log("------------------------------ Create Account ------------------------------ ");
    console.log("Receipt status       :", statusCreateAccountTx.toString());
    console.log("Transaction ID       :", txIdAccountCreated);
    console.log("Hashscan URL         :", `https://hashscan.io/testnet/transaction/${txIdAccountCreated}`);
    console.log("Account ID           :", accountId.toString());
    console.log("EVM Address          :", accountEvmAddress);
    console.log("Private key          :", `0x${accountPrivateKey.toStringRaw()}`);
    console.log("Public key           :", `0x${accountPublicKey.toStringRaw()}`);

    // ---------------- Create a topic (HCS) ----------------

    const txCreateTopic = new TopicCreateTransaction();

    // Sign with the operator key and submit
    const txCreateTopicResponse = await txCreateTopic.execute(client);

    // Request the receipt
    const receiptCreateTopicTx = await txCreateTopicResponse.getReceipt(client);

    // Get the consensus status
    const statusCreateTopicTx = receiptCreateTopicTx.status;

    // Get the Transaction ID
    const txCreateTopicId = txCreateTopicResponse.transactionId.toString();

    // Get the topic ID
    const topicId = receiptCreateTopicTx.topicId.toString();

    console.log("------------------------------ Create Topic ------------------------------ ");
    console.log("Receipt status           :", statusCreateTopicTx.toString());
    console.log("Transaction ID           :", txCreateTopicId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/transaction/" + txCreateTopicId);
    console.log("Topic ID                 :", topicId);

  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();
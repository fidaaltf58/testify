const {
  AccountId,
  PrivateKey,
  Client,
  TokenMintTransaction,
  TokenFreezeTransaction,
  TransferTransaction,
} = require("@hiero-ledger/sdk");

// Mints Reward Tokens and delivers them to a recipient. Reward Tokens are
// deliberately NOT frozen after delivery, unlike XP/credentials — they're
// meant to be spendable at redemption (invariant 3.1: transferable assets
// confer no access, so there's nothing to soulbind here). The freeze key
// still exists on the token for wipe-at-expiry and policy enforcement.

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    const tokenId = process.env.REWARD_TOKEN_ID;
    if (!tokenId) throw new Error("Set REWARD_TOKEN_ID in .env first (run create-reward-token.js)");

    const amount = Number(process.argv[2] || 220);
    const recipientId = process.argv[3] || process.env.CANDIDATE_ACCOUNT_ID;
    if (!recipientId) throw new Error("Pass a recipient account ID, or set CANDIDATE_ACCOUNT_ID in .env");

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    await (await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(amount)
      .execute(client)).getReceipt(client);
    console.log(`Minted ${amount} FSRWD to treasury`);

    await (await new TransferTransaction()
      .addTokenTransfer(tokenId, accountId, -amount)
      .addTokenTransfer(tokenId, recipientId, amount)
      .execute(client)).getReceipt(client);
    console.log(`Delivered ${amount} FSRWD to ${recipientId} — spendable, not soulbound`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

const {
  AccountId,
  PrivateKey,
  Client,
  TokenMintTransaction,
  TokenUnfreezeTransaction,
  TokenFreezeTransaction,
  TransferTransaction,
} = require("@hiero-ledger/sdk");

// Mint XP to the treasury, then unfreeze -> transfer -> freeze so it lands
// soulbound in the recipient's account. Here the recipient is the same
// operator account (self-mint) since we don't have a second funded testnet
// account handy for this demo — swap RECIPIENT_ID for a real candidate
// account once one exists.

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);
    const tokenId = process.env.XP_TOKEN_ID;
    if (!tokenId) throw new Error("Set XP_TOKEN_ID in .env first (run create-xp-token.js)");

    const amount = Number(process.argv[2] || 50);
    const recipientId = process.env.RECIPIENT_ID || process.env.HEDERA_ACCOUNT_ID;

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(amount)
      .execute(client);
    await mintTx.getReceipt(client);
    console.log(`Minted ${amount} XP to treasury (${accountId.toString()})`);

    if (recipientId !== accountId.toString()) {
      await (await new TokenUnfreezeTransaction()
        .setTokenId(tokenId)
        .setAccountId(recipientId)
        .execute(client)).getReceipt(client);

      await (await new TransferTransaction()
        .addTokenTransfer(tokenId, accountId, -amount)
        .addTokenTransfer(tokenId, recipientId, amount)
        .execute(client)).getReceipt(client);

      await (await new TokenFreezeTransaction()
        .setTokenId(tokenId)
        .setAccountId(recipientId)
        .execute(client)).getReceipt(client);

      console.log(`Delivered + re-froze ${amount} XP for ${recipientId} (soulbound)`);
    } else {
      console.log(`Self-minted to treasury — set RECIPIENT_ID in .env to demo the unfreeze->transfer->freeze soulbind sequence to a second account`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

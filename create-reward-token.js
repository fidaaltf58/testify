const {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} = require("@hiero-ledger/sdk");

// Reward Token — fungible, per-issuer, Supply + Freeze + Wipe keys per the
// spec's key-configuration table. Deliberately NOT building the reserve
// pool / redemption contract here — that's still blocked on the group's
// decision about Reward Token FX/pool mapping. This just creates the
// token itself, the same scoped step create-xp-token.js was.

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const tx = await new TokenCreateTransaction()
      .setTokenName("Fenwick Systems Reward")
      .setTokenSymbol("FSRWD")
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(accountId)
      .setSupplyKey(privateKey)
      .setFreezeKey(privateKey)
      .setWipeKey(privateKey)
      .setFreezeDefault(false) // same real constraint as the credential collection — see README
      .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log(`Reward Token created: ${receipt.tokenId.toString()}`);
    console.log(`Add to .env: REWARD_TOKEN_ID=${receipt.tokenId.toString()}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

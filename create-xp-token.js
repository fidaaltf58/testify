const {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} = require("@hiero-ledger/sdk");

// Phase 3 of the backend build order: token setup.
// XP Token — fungible, per-issuer, Supply + Freeze keys only.
// freezeDefault: true means every new holder starts frozen — soulbound
// from the moment they receive it, per invariant 3.1.

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const tx = await new TokenCreateTransaction()
      .setTokenName("Fenwick Systems XP")
      .setTokenSymbol("FSXP")
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(accountId)
      .setSupplyKey(privateKey)
      .setFreezeKey(privateKey)
      .setFreezeDefault(true)
      .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log(`XP Token created: ${receipt.tokenId.toString()}`);
    console.log(`Add this to .env as XP_TOKEN_ID=${receipt.tokenId.toString()}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

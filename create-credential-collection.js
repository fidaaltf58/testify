const {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
} = require("@hiero-ledger/sdk");

// The certificate side — an HTS NFT collection for credentials.
// Supply + Freeze + Wipe: mint, soulbind (freeze-after-mint), revoke (wipe).
// No Admin key set — matches the current spec, flagged elsewhere as a live
// disagreement worth resolving, not silently picked one way here either.

async function main() {
  let client;
  try {
    const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
    const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

    client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const tx = await new TokenCreateTransaction()
      .setTokenName("Testify Course Credentials")
      .setTokenSymbol("TESTIFY-CRED")
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(accountId)
      .setSupplyKey(privateKey)
      .setFreezeKey(privateKey)
      .setWipeKey(privateKey)
      .setFreezeDefault(false)
      .execute(client);
    // freezeDefault is false deliberately: auto-association (via the
    // recipient's maxAutomaticTokenAssociations) creates the relationship
    // in the token's default state — if that default were frozen, the very
    // transfer that establishes the association would be rejected as a
    // deposit into a frozen account. Soulbinding still happens, just as an
    // explicit freeze immediately after delivery instead of before it.

    const receipt = await tx.getReceipt(client);
    console.log(`Credential NFT collection created: ${receipt.tokenId.toString()}`);
    console.log(`Add to .env: CREDENTIAL_TOKEN_ID=${receipt.tokenId.toString()}`);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();

const {
  AccountId,
  PrivateKey,
  Client,
  AccountCreateTransaction,
  Hbar,
} = require("@hiero-ledger/sdk");

// The real signup flow, per the Q1 design: the Operator creates a brand
// new Hedera account on the spot, pays for it, and sets a high
// automatic-token-association limit so nothing later blocks the candidate
// receiving XP or a credential. No pre-existing wallet, no account ID
// typed in beforehand — signing up IS getting an account.
//
// Honest gap, flagged rather than hidden: a real non-custodial handoff
// (Q1's "hand the key over once, never store it") isn't implemented here.
// The key is generated so Hedera has something to satisfy setKey() with,
// then discarded — nothing built so far actually needs the candidate to
// sign anything (delivery is entirely issuer-driven: unfreeze -> transfer
// -> freeze). The moment something needs the candidate's own signature
// (e.g. accepting an employment event), real key custody has to be built
// before that feature can be real.

async function createAccount() {
  const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY);

  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  try {
    const freshKey = PrivateKey.generateECDSA();

    const tx = await new AccountCreateTransaction()
      .setKey(freshKey.publicKey)
      .setInitialBalance(new Hbar(5))
      .setMaxAutomaticTokenAssociations(100)
      .execute(client);

    const receipt = await tx.getReceipt(client);
    return { accountId: receipt.accountId.toString() };
  } finally {
    client.close();
  }
}

module.exports = { createAccount };

if (require.main === module) {
  createAccount()
    .then((r) => console.log(`Account created: ${r.accountId}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

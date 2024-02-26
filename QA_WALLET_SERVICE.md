Ideally, you will run these steps with the same wallet that ran the normal QA.
If not, at least create a custom token and close the wallet before starting.

1. **Wallet Service initialization**
    1. Go to Settings and copy the "Unique identifier"
    1. Go to the unleash dashboard and add it to the list of UserIDs
    1. Close your wallet (not lock) and open it again.
    1. Unlock the wallet and check that your history is showing correctly.

1. **Wallet screen**
    1. Check that you have HTR and other custom tokens on your wallet.
    1. Copy the address and send 1.00 HTR from another wallet to this address.
    1. Check that we receive a notification for the transaction.
    1. Check that the transaction appears in the list, the balance was updated and the address also changed.
    1. Click on 'See all addresses' and see the list.
    1. Search for the address used to send the transaction and check that it has 'Number of transactions' equal to 1.

1. **Custom tokens**
    1. Click on 'Custom tokens', then 'Create a new token'.
    1. Create a token 'WS Test Token', 'WTST', amount 100.
    1. Validate its symbol appeared selected in the token bar.
    1. The list of transactions should have only one, with type 'Token creation' and amount of 100.00.
    1. Click on the HTR token (in the token bar) and check if the first transaction is of type 'Token deposit' with amount of 1.00.

1. **Custom token admin**
    1. Click on 'WTST' on the token bar and then on 'Administrative tools'
    1. Use the 'Melt tokens' to melt all tokens you have.
    1. Go to 'Balance & History' and check that the 'Total' is 0 and that the melt transaction appears on teh list.
    1. Go back to 'Administrative tools' and use 'Mint tokens' mint 100 tokens.
    1. Click on 'Balance & History' and check the mint transaction is on the list.
    1. Check that the 'Total' and 'Available' are 100.00 WTST



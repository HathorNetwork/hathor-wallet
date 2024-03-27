1. **Wallet Service initialization**
    1. Start a new wallet
        1. Send 1.00 HTR from another wallet to the wallet address.
        1. Create a custom token 'WST0', amount 100.
    1. Go to Settings and copy the "Unique identifier"
    1. Go to the unleash dashboard and add it to the list of UserIDs
    1. Close your wallet (not lock) and open it again.
    1. Unlock the wallet and check that your history is showing correctly.
    1. Check that you have balance for HTR (0.99 HTR) and WST0 (100.00 WST0)
    1. Check that you have authorities for mint and melt for WST0.

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
    1. Go to 'Balance & History' and check that the 'Total' is 0 and that the melt transaction appears on the list.
    1. Go back to 'Administrative tools' and use 'Mint tokens' mint 100 tokens.
    1. Click on 'Balance & History' and check the mint transaction is on the list.
    1. Check that the 'Total' and 'Available' are 100.00 WTST
    1. Copy the current address and go back to 'Administrative tools'
    1. Use the 'Delegate mint' to the address you copied, keep the 'Create another mint output for you?' checked.
    1. Check that the message under 'Mint authority management' now reads 'You are the owner of 2 mint outputs'.
    1. Use the 'Destroy mint' to destroy one authority.
    1. Check that the message under 'Mint authority management' now reads 'You are the owner of 1 mint output'.
    1. Use the 'Delegate melt' to the address you copied, keep the 'Create another mint output for you?' checked.
    1. Check that the message under 'Melt authority management' now reads 'You are the owner of 2 melt outputs'.
    1. Use the 'Destroy melt' to destroy one authority.
    1. Check that the message under 'Melt authority management' now reads 'You are the owner of 1 melt output'.

1. **Settings**
    1. Go to Settings and click on "Change server"
    1. Use the following urls to connect to testnet wallet service.
        1. `https://wallet-service.testnet.hathor.network`
        1. `wss://ws.wallet-service.testnet.hathor.network`
    1. Check that you are connected to the testnet in the upper right corner.
    1. Check that your address starts with 'W'.
    1. Go to Settings and click on "Change server"
    1. Connect to the mainnet wallet service.
        1. `https://wallet-service.hathor.network`
        1. `wss://ws.wallet-service.hathor.network`
    1. Check that you are connected to the mainnet in the upper right corner.
    1. Check that your address starts with 'H'.
    1. Go to Settings and set "Hide zero-balance tokens" to yes.
    1. Go to "WTST" and melt all tokens.
    1. Check that "WTST" does not appear on the token bar.
    1. Go to Settings and set "Hide zero-balance tokens" to no.
    1. Check that "WTST" appears on the token bar.
    1. Click on "WTST" and go to "About WS Test Token" and change "Always show this token" to yes.
    1. Go to Settings and set "Hide zero-balance tokens" to yes.
    1. Melt all WTST tokens.
    1. Check that "WTST" is still on the token bar.
    1. Check that the "WTST" balance is zero.

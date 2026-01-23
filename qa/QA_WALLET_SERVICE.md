### Wallet Service initialization
1. Start a new wallet
    1. Send `1.00` HTR from another wallet to the wallet address.
    1. Create a custom token `WST0`, amount `100`.
1. Go to Settings and copy the "Unique identifier"
1. Go to the unleash dashboard and add it to the list of UserIDs for the "Wallet Service" feature toggle.
1. Close your wallet (not lock) and open it again.
1. Unlock the wallet and check that your history is showing correctly.
1. Check that you have balance for `HTR` (`0.99` HTR) and `WST0` (`100.00` WST0)
1. Check that you have authorities for mint and melt for `WST0`.

### Wallet screen
1. Check that you have HTR and other custom tokens on your wallet.
1. Copy the address and send `1.00` HTR from another wallet to this address.
1. Check that we receive a notification for the transaction.
1. Check that the transaction appears in the list, the balance was updated and the address also changed.
1. Click on 'See all addresses' and see the list.
1. Search for the address used to send the transaction and check that it has 'Number of transactions' equal to 1.

### Custom tokens
1. Click on 'Custom tokens', then 'Create a new token'.
1. Create a token 'WS Test Token', `WST1`, amount `100`.
1. Validate its symbol appeared selected in the token bar.
1. The list of transactions should have only one, with type 'Token creation' and amount of `100.00`.
1. Click on the HTR token (in the token bar) and check if the first transaction is of type 'Token deposit' with amount of 1.00.

### Custom token admin
1. Click on 'WST1' on the token bar and then on 'Administrative tools'
1. Use the 'Melt tokens' to melt all tokens you have.
1. Go to 'Balance & History' and check that the 'Total' is `0` and that the melt transaction appears on the list.
1. Go back to 'Administrative tools' and use 'Mint tokens' mint `100` tokens.
1. Click on 'Balance & History' and check the mint transaction is on the list.
1. Check that the 'Total' and 'Available' are `100.00` `WST1`
1. Copy the current address and go back to 'Administrative tools'
1. Use the 'Delegate mint' to the address you copied, keep the 'Create another mint output for you?' checked.
1. Check that the message under 'Mint authority management' now reads 'You are the owner of `2` mint outputs'.
1. Use the 'Destroy mint' to destroy one authority.
1. Check that the message under 'Mint authority management' now reads 'You are the owner of `1` mint output'.
1. Use the 'Delegate melt' to the address you copied, keep the 'Create another mint output for you?' checked.
1. Check that the message under 'Melt authority management' now reads 'You are the owner of `2` melt outputs'.
1. Use the 'Destroy melt' to destroy one authority.
1. Check that the message under 'Melt authority management' now reads 'You are the owner of `1` melt output'.

### Settings - Server
1. Switch the network to `testnet`.
1. On the "Change Server" screen, select `Custom network` and adapt only the values below to use the testnet Wallet Service.
   1. Wallet Service URL: `https://wallet-service.testnet.hathor.network`
   1. Wallet Service Websocket URL: `wss://ws.wallet-service.testnet.hathor.network`
1. Check that you are connected to the testnet in the upper right corner and that your address starts with 'W'.
1. Now connect to the mainnet wallet service and then adapt a `Custom network` with the values below:
   1. Wallet Service URL: `https://wallet-service.hathor.network`
   1. Wallet Service Websocket URL: `wss://ws.wallet-service.hathor.network`
1. Check that you are connected to the mainnet in the upper right corner and that your address starts with 'H'.

### Settings - Hide zero-balance tokens
1. Go to Settings and set "Hide zero-balance tokens" to yes.
1. Go to `WST1` and melt all tokens.
1. Navigate to `HTR` token screen and check that `WST1` does not appear on the token bar anymore.
1. Go to Settings and set "Hide zero-balance tokens" to no.
1. Check that `WST1` appears on the token bar.
1. Click on `WST1` and go to "About WS Test Token" and change "Always show this token" to yes.
1. Go to Settings and set "Hide zero-balance tokens" to yes.
1. Check that `WST1` is still on the token bar.
1. Check that the `WST1` balance is zero.

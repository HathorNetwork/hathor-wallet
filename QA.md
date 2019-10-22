# Test Sequence

### Those tests must be done in an Electron application. Some features might work on the web browser but show different behavior when using electron.

- **Initialization**
1. [] Try to click 'Get started' without selecting checkbox (must show error).
1. [] Start new wallet.
1. [] Try to click 'Create my words' without selecting checkbox (must show error).
1. [] Select to do backup now. (Really save those words, we will load this wallet later with them).
1. [] Click 'Validate' before selecting all the words.
1. [] Click 'Validate' with all words selected but in the wrong order.
1. [] Validate with correct order.
1. [] Try to select insecure password (like '123'). It must show error.
1. [] Select password and PIN.

- **New token error**
1. [] Click on 'Custom tokens', then 'Create a new token'.
1. [] Type 'Test token' in the token name, 'Test' in the symbol and 100 in the amount.
1. [] Validates that the deposit required is 1.00 HTR.
1. [] Try to create the token and receive an error that you don't have enough HTR.

- **Wallet screen**
1. [] It shows a red label with the testnet name in the top right corner of the screen.
1. [] Copy the address and send HTR to it.
1. [] Check that the transaction appears in the list, the balance was updated and the address also changed.
1. [] Click on 'Generate new address' and validate it has changed.
1. [] Click on the 'QR Code', and copy the address to validate it really copied.
1. [] Read the QRCode and validate it's the same as the written text.
1. [] Download the QRCode and execute the same validation.
1. [] Send another transaction to you address but with timelock.
1. [] Validate that your balance is updated but the new tokens are locked.

- **Lock/Unlock**
1. [] Click on the lock in the bottom left part of the screen, must go to the locked screen asking for the PIN.
1. [] Try to unlock with a wrong PIN.
1. [] Unlock it and check that you transactions were loaded with correct balance.

- **Transaction detail**
1. [] Click on the last transaction in the list.
1. [] It should appear the transaction data with the output you received with the time until when it's locked.
1. [] Click on the 'Back' link to go back to the main wallet screen.

- **Create new token**
1. [] Click on 'Custom tokens', then 'Create a new token'.
1. [] Create a token 'Test Token', 'TST', amount 100.
1. [] Validate its symbol appeared selected in the token bar.
1. [] The list of transactions should have only one, with type 'Token creation' and amount of 100.00.
1. [] Click on the HTR token (in the token bar) and check if the first transaction is of type 'Token deposit' with amount of 1.00.

- **Transaction detail**
1. [] Click on the transaction that has the token deposit (this is the transaction responsible for creating the new token).
1. [] Validate it has an input of HTR, an output of the total amount created for the new token, a mint and melt authority output and it might have a change HTR output (depending on the input spent).
1. [] Validate it has the new created token in the token list.
1. [] Click on the token uid and should redirect to the wallet main screen with TST selected.

- **Send tokens**
1. [] Copy the address.
1. [] Click on 'Send tokens'.
1. [] Send an amount of HTR and TST to the copied address.
1. [] The first transaction on the list must have amount 0.00.
1. [] Click on this transaction and check that it has inputs and outputs for both tokens. And TST must be on the token list.

- **Unregister TST**
1. [] Click on the TST uid to redirect to the main screen.
1. [] Click on the trash icon besides the name to unregister the token.

- **Transaction detail**
1. [] It should be on the main screen with the HTR selected. Click on the first transaction.
1. [] The token list now has a warning that TST is not registered.
1. [] Click on the uid and register it. 

- **Register in the 'Custom tokens' screen**
1. [] Click on 'About TST' tab.
1. [] Validate that all informations are correct (name, symbol, supply) and copy the configuration string.
1. [] Unregister the token TST.
1. [] Click on 'Custom tokens', then 'Register token'.
1. [] Register the token with the copied string.
1. [] Click on the 'Back' link.

- **Register in the 'number' in the token bar**
1. [] Unregister the token again.
1. [] Click on the blue circle on the token token bar with the number 1.
1. [] Click on the 'Show history' and see the transactions of the TST token.
1. [] Click on 'Register tokens' and register it again with the copied configuration string.

- **Administrative tools**
1. [] Go back to the wallet main screen and select TST token.
1. [] Click on 'Administrative Tools' tab.
1. [] Total supply and your balance should be 100.00 and you must have 1 mint output and 1 melt output.
1. [] Click to mint tokens.
1. [] Mint 50.00 new tokens. The total supply and your balance must be 150.00 now.
1. [] Click to melt tokens.
1. [] Melt 20.00 tokens. The total supply and your balance must be 130.00 now.
1. [] Click on 'Balance & History' and copy your address. Then go back to 'Administrative Tools' and click to delegate mint.
1. [] Type your address and delegate. Now you must have 2 mint outputs.
1. [] Get a random address and click to delegate melt. Deselect the option to 'Create another melt output for you?'. Delegate and now you must have no melt outputs.
1. [] Click on 'About TST' and you should see 'Can melt tokens: No'.
1. [] Go back to the 'Administrative Tools', click to destroy mint and select 2. You must see a message saying 'You have no more authority outputs for this token'.
1. [] Go to 'About TST' tab and must see 'Can mint new tokens: No'.

- **Explorer**
1. [] Click on 'Explorer' -> 'Transactions'. And then click on the first transaction.
1. [] Copy the transaction ID and click on the 'Back' link.
1. [] Type this transaction ID on the search field and press 'Enter'. It should go to the transaction detail screen.
1. [] Go to the bottom part of the screen, click on 'Show raw transaction' and copy it.
1. [] Click on 'Explorer' -> 'Decode Tx'.
1. [] Type this raw transaction copied and click on 'Decode tx'. Check if it's the same transaction.

- **Change server**
1. [] Click on the 'Wallet' navigation link, then on the settings icon and the on 'Change server'.
1. [] Select one of the default servers and connect.
1. [] The transaction list must be empty.
1. [] Go back, change again to your test server and validate all transactions appear again.

- **Add passphrase**
1. [] Click on the settings icon and then 'Set a passphrase'.
1. [] Choose any passphrase and confirm it. It must show an empty list again.
1. [] Go back to the passprase screen and now select 'I want to set a blank passphrase.' and confirm it. All transactions must appear again.

- **Notifications and bug report**
1. [] Click on the settings icon and 'Change' link on the 'Allow notifications' option. Click to change and see that now it's 'No'.
1. [] Do the same with the bug report to validate it's changing.

- **Load wallet**
1. [] Click on 'Reset all data' and confirm it.
1. [] Now load the wallet with the saved words. All transactions must appear normally.

- **Late backup**
1. [] Reset wallet and start a new one without doing backup. It must show a yellow warning saying a backup must be done.
1. [] Do the backup (following procedures in the 'Initialization' tests). The backup have to disappear.

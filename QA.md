# Test Sequence

### These tests must be done in an Electron application. Some features might work on the web browser but show different behavior when using electron.

1. **Wallet update**
    1. [Using the old version of the wallet!] If your wallet is not initialized, initialize it.
    1. Close the wallet.
    1. Install the new version of Hathor Wallet.
    1. Open Hathor Wallet. It should be on lock screen.
    1. Unlock it and check that you transactions were loaded with correct balance.
    1. You may know reset your wallet.

1. **Initialization**
    1. Try to click 'Get started' without selecting checkbox (must show error).
    1. Start new wallet.
    1. Try to click 'Create my words' without selecting checkbox (must show error).
    1. Select to do backup now. (Really save those words, we will load this wallet later with them).
    1. Click 'Validate' before selecting all the words, you must see an error message on the screen.
    1. Click 'Validate' with all words selected but in the wrong order, you must see an error message on the screen.
    1. Validate with correct order.
    1. Try to select insecure password (like '123'). It must show error.
    1. Select password and PIN.

1. **New token error**
    1. Click on 'Custom tokens', then 'Create a new token'.
    1. Type 'Test token' in the token name, 'Test' in the symbol and 100 in the amount.
    1. Validates that the deposit required is 1.00 HTR.
    1. Try to create the token and receive an error that you don't have enough HTR.

1. **Wallet screen**
    1. Copy the address and send 10.00 HTR from another wallet to this address.
    1. Check that the transaction appears in the list, the balance was updated and the address also changed.
    1. Click on 'Generate new address' and validate it has changed.
    1. Click on the 'QR Code', and copy the address to validate it really copied.
    1. Read the QRCode and validate it's the same as the written text.
    1. Download the QRCode and execute the same validation.
    1. Send another transaction to you address but with timelock.
    1. Validate that your balance is updated but the new tokens are locked.

1. **Lock/Unlock**
    1. Click on the lock in the bottom left part of the screen, must go to the locked screen asking for the PIN.
    1. Try to unlock with a wrong PIN.
    1. Unlock it and check that you transactions were loaded with correct balance.
    1. Close Hathor Wallet.
    1. Open again and you should be on the lock screen.
    1. Unlock it and check that you transactions were loaded with correct balance.

1. **Transaction detail**
    1. Click on the first transaction in the list.
    1. It should appear the transaction data with the output you received with the time until when it's locked.
    1. Click on the 'Back' link to go back to the main wallet screen.

1. **Create new token**
    1. Click on 'Custom tokens', then 'Create a new token'.
    1. Create a token 'Test Token', 'TST', amount 100.
    1. Validate its symbol appeared selected in the token bar.
    1. The list of transactions should have only one, with type 'Token creation' and amount of 100.00.
    1. Click on the HTR token (in the token bar) and check if the first transaction is of type 'Token deposit' with amount of 1.00.

1. **Transaction detail**
    1. Click on the transaction that has the token deposit (this is the transaction responsible for creating the new token).
    1. Validate it has an input of HTR, an output of the total amount created for the new token, a mint and melt authority output and it might have a change HTR output (depending on the input spent).
    1. Validate it has the new created token in the token list.
    1. Click on the token uid and should redirect to the wallet main screen with TST selected.

1. **Send tokens**
    1. Copy the address.
    1. Click on 'Send tokens'.
    1. Send an amount of HTR and TST to the copied address.
    1. The first transaction on the list must have amount 0.00 (for both HTR and TST).
    1. Click on this transaction and check that it has inputs and outputs for both tokens. And TST must be on the token list.

1. **Unregister TST**
    1. Click on the TST uid to redirect to the main screen.
    1. Click on the trash icon besides the name to unregister the token.

1. **Transaction detail**
    1. It should be on the main screen with the HTR selected. Click on the first transaction.
    1. The token list now has a warning that TST is not registered.
    1. Click on the uid and register it. 

1. **Register in the 'Custom tokens' screen**
    1. Click on 'About Test Token' tab.
    1. Validate that all informations are correct (name, symbol, supply) and copy the configuration string.
    1. Unregister the token TST.
    1. Click on 'Custom tokens', then 'Register token'.
    1. Register the token with the copied string.
    1. Click on the 'Back' link.

1. **Register in the 'number' in the token bar**
    1. Unregister the token again.
    1. Click on the blue circle on the token token bar with the number 1.
    1. Click on the 'Show history' and see the transactions of the TST token.
    1. Click on 'Register tokens' and register it again with the copied configuration string.

1. **Administrative tools**
    1. Go back to the wallet main screen and select TST token.
    1. Click on 'Administrative Tools' tab.
    1. Total supply and your balance should be 100.00 and you must have 1 mint output and 1 melt output.
    1. Click to mint tokens.
    1. Try to mint 10,000.00. It must show an error that you don't have enough HTR for the deposit.
    1. Mint 50.00 new tokens. The total supply and your balance must be 150.00 now.
    1. Click to melt tokens.
    1. Try to melt 200.00 TST. It must show and error that you don't have this amount to melt.
    1. Melt 20.00 tokens. The total supply and your balance must be 130.00 now.
    1. Click on 'Balance & History' and copy your address. Then go back to 'Administrative Tools' and click to delegate mint.
    1. Type your address and delegate. Now you must have 2 mint outputs.
    1. Get a random address and click to delegate melt. Deselect the option to 'Create another melt output for you?'. Delegate and now you must have no melt outputs.
    1. Go back to the 'Administrative Tools', click to destroy mint and select 2. You must see a message saying 'You have no more authority outputs for this token'.
    1. Go to 'About TST' tab and must see 'Can mint new tokens: No'.

1. **Explorer**
    1. Click on 'Explorer' -> 'Transactions'. And then click on the first transaction.
    1. Copy the transaction ID and click on the 'Back' link.
    1. Type this transaction ID on the search field and press 'Enter'. It should go to the transaction detail screen.
    1. Go to the bottom part of the screen, click on 'Show raw transaction' and copy it.
    1. Click on 'Explorer' -> 'Decode Tx'.
    1. Type this raw transaction copied and click on 'Decode tx'. Check if it's the same transaction.

1. **Change server**
    1. Click on the 'Wallet' navigation link, then on the settings icon and the on 'Change server'.
    1. Select one of the default servers and connect.
    1. The transaction list must be empty.
    1. Go back, change again to your test server and validate all transactions appear again.

1. **Add passphrase**
    1. Click on the settings icon and then 'Set a passphrase'.
    1. Choose any passphrase and confirm it. It must show an empty list again.
    1. Go back to the passprase screen and now select 'I want to set a blank passphrase.' and confirm it. All transactions must appear again.

1. **Notifications and bug report**
    1. Click on the settings icon and 'Change' link on the 'Allow notifications' option. Click to change and see that now it's 'No'.
    1. Do the same with the bug report to validate it's changing.

1. **Load wallet**
    1. Click on 'Reset all data' and confirm it.
    1. Now load the wallet with the saved words. All transactions must appear normally.

1. **Register tokens with same name**
    1. Unregister TST token but copy its configuration string and save it.
    1. Click on 'Custom tokens' and then 'Create a new token'.
    1. Type 'Test token' in the token name, 'Test' in the symbol and 200 in the amount.
    1. Now click on 'Custom tokens', then 'Register a token'.
    1. Type 'abc'. It should show an error of invalid configuration string.
    1. Type the configuration string saved in the first step. It must appear an error that you already have a token with this name.

1. **Try to spend same output**
    1. Click on 'Wallet' in the navigation bar, select the HTR token and copy the address (and save it).
    1. Click on the first transaction (the one with amount 0.00).
    1. Copy the first input from HTR and from your address (copy the transaction ID and the index).
    1. Click on 'Send tokens'.
    1. Paste the address and 1.00 as the amount. Deselect 'Choose inputs automatically' and paste the transaction ID and index copied before.
    1. Must see an error that the output is already spent.

1. **Late backup**
    1. Reset wallet and start a new one without doing backup. It must show a yellow warning saying a backup must be done.
    1. Do the backup (following procedures in the 'Initialization' tests). The backup message has to disappear.

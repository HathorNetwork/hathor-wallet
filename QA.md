# Test Sequence

### These tests must be done in an Electron application. Some features might work on the web browser but show different behavior when using electron.

You can connect your wallet to the testnet (https://node1.foxtrot.testnet.hathor.network/v1a/) to run the tests.

1. **Wallet update**
    1. [Using the old version of the wallet!] If your wallet is not initialized, initialize it.
    1. Close the wallet.
    1. Install the new version of Hathor Wallet.
    1. Open Hathor Wallet. It should be on lock screen.
    1. Unlock it and check that you transactions were loaded with correct balance (it's ok if there are no transactions).
    1. You may now reset your wallet.

1. **Initialization (you must be on Welcome screen)**
    1. Close and open your wallet. You must still be on the Welcome screen.
    1. Try to click 'Get started' without selecting checkbox (must show error).
    1. Choose Software Wallet.
    1. Start new wallet.
    1. Try to click 'Create my words' without selecting checkbox (must show error).
    1. Close and open your wallet. You must see the screen to select 'New wallet' or 'Import wallet'. Select 'new wallet' and then 'create my words'.
    1. Select to do backup now. (Really save those words, we will load this wallet later with them).
    1. Correctly select the first word but select a wrong one in the second. Check that it returns to the seed screen to restart the validation.
    1. Validate all the words correctly.
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
    1. Click on 'See all addresses' and see the list. The address used to send the transaction should have 'Number of transactions' equal to 1.
    1. Copy this address and paste to search, validate it appears only one line on the table with the searched address.
    1. Click on 'Generate new address' and validate it has changed.
    1. Click on the 'QR Code', and copy the address to validate it really copied.
    1. Read the QRCode and validate it's the same as the written text.
    1. Download the QRCode and execute the same validation.
    1. Send another transaction to your address but with timelock.
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

1. **Create an NFT**
    1. Click on 'Custom tokens', then 'Create an NFT'.
    1. Set the NFT data as 'ipfs://test', name as 'Test Token', symbol 'TST', and amount 10.
    1. Validate the fee shows as 0.01 HTR and deposit as 0.01 HTR as well.
    1. Create the NFT and see it created on the testnet explorer (should be the last transaction or you can search by token uid).
    1. Double check that the first output is the data output and the token output has 0.10 of amount.
    1. Back to the wallet, validate its symbol appeared selected in the token bar.
    1. The list of transactions should have only one, with type 'Token creation' and amount of 0.10.
    1. Click on the HTR token (in the token bar) and check if the first transaction is of type 'Token deposit' with amount of 0.01.

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
    1. Click on the purple circle on the token token bar with the number 1.
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
    1. Click to delegate melt and deselect the option to 'Create another melt output for you?'. Delegate the authority to the address WZ7pDnkPnxbs14GHdUFivFzPbzitwNtvZo and now you must have no melt outputs.
    1. Go back to the 'Administrative Tools', click to destroy mint and select 3. You must see an error message that you don't have 3 mint authority outputs.
    1. Select 2 and complete the destroy. You must see a message saying 'You have no more authority outputs for this token'.
    1. Go to 'About TST' tab and must see 'Can mint new tokens: No'.

1. **Change server**
    1. Click on the 'Wallet' navigation link, then on the settings icon and the on 'Change server'.
    1. Select one of the default servers and connect. It will connect to the mainnet.
    1. The transaction list must be empty.
    1. Go back, change again to the testnet server. Before loading the wallet it must ask to confirm that you want to connect to a testnet. Check that all transactions load again.

1. **Add passphrase**
    1. Click on the settings icon and then 'Set a passphrase'.
    1. Choose any passphrase and confirm it. It must show an empty list again.
    1. Go back to the passprase screen and now select 'I want to set a blank passphrase.' and confirm it. All transactions must appear again.

1. **Notifications and bug report**
    1. Click on the settings icon and 'Change' link on the 'Allow notifications' option. Click to change and see that now it's 'No'.
    1. Do the same with the bug report to validate it's changing.

1. **Reload wallet**
    1. Turn wifi off until the status change to 'Offline'.
    1. Turn on wifi and check if status change to 'Online' again and the wallet reload the transactions.
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

1. **Create NFT**
    1. Click on 'Custom tokens', then 'Create an NFT'.
    1. Fill NFT data as 'test data', name and symbol as 'NFT Test' and 'NFTT', and amount as 100. Check only the melt authority checkbox.
    1. Double check the Fee is 0.01 HTR, the deposit is 0.01 HTR and the Total is 0.02 HTR.
    1. Create the NFT and open the transaction on the list.
    1. Validate that the first output is the data output unable to decode with 0.01 HTR and there is one output with 1.00 of tokens, one output with the melt authority and possibly one change output of HTR.

1. **Late backup**
    1. Reset the wallet and close it.
    1. Open the wallet with the parameters `--unsafe-mode --debug`.
    1. Click on the application menu Debug > Open Dev Tools. Then type `localStorage.clear()`. This is to simulate a fresh install of the app.
    1. Close and open the wallet again and start a new wallet one without doing backup. It must show a yellow warning saying a backup must be done.
    1. Do the backup (following procedures in the 'Initialization' tests). The backup message has to disappear.

1. **Hardware wallet initialization**
    1. Reset the wallet one more time.
    1. Connect your Ledger device to the computer. The Ledger should be initialized already.
    1. Open the Hathor app on Ledger.
    1. On the desktop wallet, mark the checkbox and click 'Get Started'.
    1. Choose 'Hardware Wallet'.
    1. Wallet should go through both steps and show 'Step 1/2' and 'Step 2/2'.
    1. On your Ledger, check it is requesting your authorization.
    1. Deny the authorization request on Ledger (scroll with left or right and click both buttons on "Reject" step). It should show an error on the wallet.
    1. Click 'Try again'. It goes through both steps and asks for authorization again.
    1. Grant authorization request (click both buttons on the "Approve" step). It will proceed to 'Loading transactions' screen.

1. **Ledger wallet screen**
    1. On the main wallet screen, confirm 'Address to receive tokens' is truncated (eg: 'HGZmqThwa6...'). There should be a 'Show full address' button next to it.
    1. Confirm there's no QR Code button under the truncated address.
    1. Click on 'Show full address'. A modal will display asking you to compare the address on the wallet and on Ledger.
    1. Check that the modal cannot be closed, not even by clicking outside it.
    1. Confirm that both addresses (on wallet and Ledger) are the same. Copy this address on the computed.
    1. On the Ledger click both buttons on the "Approve" step. Modal should close.
    1. Send 10.00 HTR from another wallet to the copied address.
    1. Check that the transaction appears in the list, the balance was updated and the address also changed.
    1. Click on 'Generate new address' and validate it has changed.
    1. Confirm again address on the wallet and on Ledger (by clicking 'Show full address').

1. **Ledger custom token wallet screen**
    1. On the main wallet screen get another address and send any amount of a custom token to this address.
    1. Register the token and go to the token wallet screen.
    1. Check that there is a key icon next to it's name and click the key icon.
    1. A modal should appear, confirm that the token symbol, name and uid are correct.
    1. Click the "Sign token" button and check the Ledger device, it should say "Confirm token data".
    1. Confirm that the symbol, name and uid are correct (use buttons to scroll).
    1. Click both buttons on the "Reject" step and check that an error message "User denied token on Ledger" appears on the wallet.
    1. Try to sign the token again but this time click both buttons on the "Accept" step, a success message should show on the wallet.
    1. After closing the modal, check that that the key icon is now an unclicable checkmark icon and hovering shows the message "Token signed with Ledger".

1. **Ledger reset token signature**
    1. Go to settings and click the button "Untrust all tokens on Ledger".
    1. Read the message and click "Start", the device should show "Reset token signatures".
    1. Click both buttons on the "Reject" step and check that an error message appears on the wallet.
    1. Click the "Try again" button and this time click both buttons on the "Approve" step.
    1. Go to the token wallet screen and check that the checkmark icon is back to a key icon.

1. **Ledger send tokens**
    1. On the wallet screen copy 2 different addresses from your wallet.
    1. Click on 'Send tokens' on the top menu.
    1. Confirm that the token dropdown list can be clicked and show all tokens.
    1. Confirm the Timelock checkbox is disabled.
    1. Try sending a transaction to an invalid address. An error message should show up on the wallet. Nothing should be displayed on Ledger.
    1. Try sending a transaction with an amount bigger than the one you have. An error message should show up on the wallet. Nothing should be displayed on Ledger.
    1. Send HTR tokens to both copied addresses in the same transaction (2 outputs). A modal will be displayed asking to confirm operation on Ledger.
    1. On Ledger, it should show 'Output 1/2' on the first step the address on the second and the amount on the third step (steps being from left to right), then an "Approve" and "Reject" steps. After clicking both buttons on the "Approve", it shows 'Output 2/2' and the other output (address and ammount).
    1. Clicking both buttons on the "Approve" step one more time will display the confirmation screen. Reject signing the transaction. The modal will hide and an error message should appear on the wallet.
    1. Click to send the transaction again. This time, approve it on the signing screen. Ledger screen will show 'Processing' for a while and the desktop wallet will display the modal while solving proof of work.
    1. After transaction is completed, it closes the modal and goes back to main wallet screen. The first transaction on the list must have value 0.00.
    1. Go to the custom token wallet page and confirm that the key icon is showing next to the name (and not a checkmark).
    1. If there is a checkmark icon, go to settings and untrust all tokens.
    1. Click on 'Send tokens' on the top menu again.
    1. Change the token dropdown to the custom token and try to send any amount. A modal will be displayed saying there are unverified custom tokens and the list should have the custom token added to the transaction.
    1. Go to the custom token wallet screen and sign the custom token with Ledger (key icon next to the name).
    1. Go back to the 'Send tokens' screen and click on 'Add another token' button and send HTR to an address and the custom token to the second copied address. Make sure both amounts are less than the balance available. A modal will be displayed asking to confirm operation on Ledger.
    1. On Ledger you should check that each token is being sent to the correct address then click both buttons on the 'Approve' screen.
    1. After transaction is completed, it closes the modal and goes back to main wallet screen. The first transaction on the list must have value 0.00.
    1. Click on the first transaction and confirm that it has 4 outputs. The extra 2 outputs are change outputs and should be marked with 'Your address'.

1. **Ledger misc**
    1. Go to the settings screen.
    1. Click on change server. The usual Change Server screen should show up, but with no PIN field. Change to a new server.
    1. On the settings screen, click on 'Set a passphrase'. It should show a modal saying the action is not supported and it should be done directly on Ledger.
    1. Go to Custom Tokens on the top navigation bar. Clicking 'Create a new token' should display a modal saying action is not supported.
    1. Now click on 'Create an NFT' and should display a modal saying action is not supported.
    1. Lock wallet. It should go the screen asking to select the wallet type (software or hardware).
    1. Choose 'Hardware Wallet' and go through the same process again.
    1. When finished loading the wallet, it should show the same balance and transactions as before locking.

1. **Ledger connection**
    1. On Ledger, quit the Hathor app. The desktop wallet should lock (go to wallet type screen). This *does not* happen instantly.
    1. Without opening the Hathor app on Ledger, click 'Hardware wallet'. Desktop wallet will stay on 'Step 1/2'.
    1. Open the Hathor app on Ledger. Wallet should go to 'Step 2/2' after a few seconds and ask for authorization on Ledger.

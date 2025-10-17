# Test Sequence

### These tests must be done in an Electron application. Some features might work on the web browser but show different behavior when using electron.

You can connect your wallet to the testnet (https://node1.foxtrot.testnet.hathor.network/v1a/) to run the tests.

## Starting the Wallet
### Wallet update
Testing the previous version of the wallet and then updating to the new version, making sure any eventual migration is working properly.
1. [Using the old version of the wallet] Open the wallet and take note of the version and the tokens balance.
1. Close the wallet and install the new version.
1. Open the Hathor Wallet. It should be on lock screen.
1. Unlock it and check that you transactions were loaded with correct balance (it's ok if there are no transactions).
1. You may now reset your wallet.

### Initialization
1. Close and open the Hathor Wallet. You must still be on the Welcome screen.
1. Try to click 'Get started' without selecting checkbox (must show error).
1. Select the checkbox and click 'Get started'
1. Choose 'Software Wallet' and then 'Start a new wallet'.
1. Try to click 'Create my words' without selecting checkbox (must show error).
1. Close and open your wallet. You must see the screen to select 'Hardware wallet' or 'Software wallet'.
2. Select 'Software wallet' then 'new wallet' and then 'create my words'.
1. Select to do backup now. (Really save those words, we will load this wallet later with them).
1. Correctly select the first word but select a wrong one in the second. Check that it returns to the seed screen to restart the validation.
1. Validate all the words correctly.
1. Try to select insecure password (like '123'). It must show error.
1. Add a valid password and then write a wrong confirmation. It also must show error.
1. Add a correct password and then repeat those validations above for the PIN. Check the errors.
1. Select a valid PIN and start the wallet

## Wallet functionalities
### New token with empty wallet
1. Click on 'Custom tokens', then 'Create a new token'.
1. Type 'Test token' in the token name, 'Test' in the symbol and 100 in the amount.
1. Validates that the deposit required is 1.00 HTR.
1. Try to create the token and receive an error that you don't have enough HTR.

### Addresses
1. Copy the address and send 10.00 HTR from another wallet to this address.
1. Check that the transaction appears in the list, the balance was updated and the address also changed.
1. Click on 'See all addresses' and see the list. The address used to send the transaction should have 'Number of transactions' equal to 1.
1. Copy this address and paste to search, validate it appears only one line on the table with the searched address.
1. Click on 'Generate new address' and validate it has changed.
1. Click on the 'QR Code', and copy the address to validate it really copied.
1. Read the QRCode and validate it's the same as the written text.
1. Download the QRCode and execute the same validation with the image and the filename.

### Lock/Unlock
1. Click on the lock in the bottom left part of the screen, must go to the locked screen asking for the PIN.
1. Try to unlock with a wrong PIN.
1. Unlock it and check that you transactions were loaded with correct balance.
1. Close Hathor Wallet.
1. Open again and you should be on the lock screen.
1. Unlock it again and check that you transactions were loaded with correct balance.

### Create new token
1. Click on 'Custom tokens', then 'Create a new token'.
1. Create a token 'Test Token', 'TST', amount 100.
1. Validate its symbol appeared selected in the token bar.
1. The list of transactions should have only one, with type 'Token creation' and amount of 100.00.
1. Click on the HTR token (in the token bar) and check if the first transaction is of type 'Token deposit' with amount of 1.00.

### Transaction detail - Token creation
1. Click on the transaction that has the token deposit (this is the transaction responsible for creating the new token).
1. Validate it has an input of HTR, an output of the total amount created for the new token, a mint and melt authority output and it might have a change HTR output (depending on the input spent).
1. Validate it has the new created token in the token list.
1. Validate that all the inputs and outputs from this transaction are from/to addresses that belong to your wallet by checking the "Your address" tag
1. Click on the token uid and should redirect to the wallet main screen with TST selected.

### Send Tokens
1. Send 0.01 HTR to the address `WZ7pDnkPnxbs14GHdUFivFzPbzitwNtvZo` ( or to your other test wallet being used to test )
1. Click on the sent transaction and validate that the 0.01 HTR output does not have the "Your address" tag and that the input and the change output do have
1. Copy the current address from this wallet.
1. Click on 'Send tokens'.
1. Send an amount of HTR and TST to the copied address.
1. Go back to the main screen and see the transactions list
1. The first transaction on the list must have amount 0.00 (for both HTR and TST).
1. Click on this transaction and check that it has inputs and outputs for both tokens. And TST must be on the token list.

### Transaction detail - Timelock
1. Send another transaction containing both tokens but now with one of the outputs timelocked.
1. Validate that your balance is updated with the correct amount locked.
1. Click on the first transaction in the list.
1. It should appear the transaction data with the output you received with the time until when it's locked.
1. Click on the 'Back' link to go back to the main wallet screen.

### Token details screen
1. Click on 'About Test Token' tab.
1. Validate that all informations are correct (name, symbol, supply)
1. Copy the configuration string to use in later tests.

### Register / Unregister Custom Token
#### Custom Token screen
1. Unregister the token TST.
1. Click on 'Custom tokens', then 'Register token'.
1. Register the token with the copied string.
1. Click on the 'Back' link.

#### Transaction details screen
1. Navigate back to the main screen and click on the first transaction.
1. The token list now has a warning that TST is not registered.
1. Click on the uid and register it.

#### Register in the 'number' in the token bar
1. Unregister the token again.
1. Click on the purple circle on the left token bar with the number 1.
1. Click on the 'Show history' and see the transactions of the TST token.
1. Click on 'Register tokens' and register it again with the copied configuration string.

### Administrative tools
#### Validate Token data 
1. Go back to the wallet main screen and select `TST` token.
1. Click on 'Administrative Tools' tab.
1. Validate the total supply, balance, mint and melt authorities.

#### Mint and Melt Tokens
1. Click to mint tokens.
1. Try to mint 10,000.00. It must show an error that you don't have enough HTR for the deposit.
1. Mint 50.00 new tokens. The total supply and your balance must be 150.00 now.
1. Click to melt tokens.
1. Try to melt 200.00 TST. It must show and error that you don't have this amount to melt.
1. Melt 20.00 tokens. The total supply and your balance must be 130.00 now.

#### Delegate and Destroy Authorities
1. Click on 'Balance & History' and copy your address. Then go back to 'Administrative Tools' and click to delegate mint.
1. Type your address and delegate. Now you must have 2 mint outputs.
1. Click to delegate melt and deselect the option to 'Create another melt output for you?'. Delegate the authority to the address `WZ7pDnkPnxbs14GHdUFivFzPbzitwNtvZo` (or to your other test wallet) and now you must have no melt outputs.
1. Go back to the 'Administrative Tools', click to destroy mint and select 3. You must see an error message that you don't have 3 mint authority outputs.
1. Select 2 and complete the destroy. You must see a message saying 'You have no more authority outputs for this token'.
1. Go to 'About TST' tab and must see 'Can mint new tokens: No'.

### Hide Zero-balance tokens
The token uids used in this test are only available on the testnet network. For other networks, check the Explorer to find tokens with zero balance to use in this test.

#### Hide and show tokens 
2. Go to 'Custom Tokens', then 'Register token'
1. Enter the following string: (or any other token from the Explorer for your network)<br/>
    `[Hiding Token Test:HIDET:009f4365268aa3083c3bbdabae377fbbf720604e132b58602f6572cf45af8bd5:43f57655]`
1. Go back to the Main screen and check the the token `HIDET` is now available on the token bar to the left.
1. Navigate to 'Settings', on the option `Hide zero-balance tokens`, and select `Change`.
1. Confirm that you want to hide zero-balance tokens.
1. Navigate back to the tokens screen and check that the token `HIDET` is no longer on the token bar to the left.
1. Navigate to 'Settings' and de-select the option to 'Hide zero-balance tokens'.
1. Navigate back to the tokens screen and check that the token `HIDET` is being shown again.

#### Always show tokens
1. Unregister the token `HIDET`
1. Activate the 'Hide zero-balance tokens' setting on the Settings page
1. Go to 'Custom Tokens', then 'Register token' and enter once again the `HIDET` configuration string from above
1. A message must be shown on screen alerting that you do not have balance on this token.
1. This message must also ask if you want to always show this token despite the 'Hide zero-balance tokens' being active
1. Select the 'Always show' option and register the token.
1. Navigate to the main screen and check that the `HIDET` token is being shown.
1. Go to the 'About' tab. A line must be informing that the token is always being shown.
1. This line also contains a link to change this setting for this token. Click it.
1. Confirm that you do not want to always show this token.
1. Navigate to the HTR token using the bar on the left.
1. Check that the `HIDET` token is no longer being shown on this bar.
1. Go to the 'Settings' screen and de-activate the 'Hide zero-balance tokens' setting
1. Navigate back to the main screen and check that the `HIDET` token is being displayed again on the token bar.

### Token bar scroll
1. You should have 3 tokens in your token bar, if you need more you can register the following one:<br/>
    `[Test Coin:TSC:001c382847d8440d05da95420bee2ebeb32bc437f82a9ae47b0745c8a29a7b0d:036e4b2d]`
1. Reduce the height of your screen and you must see a scroll in the tokens.
1. You must continue seeing the lock/settings icons as usual.

### Change server
1. Click on the 'Wallet' navigation link, then on the settings icon and the on 'Change server'.
1. Select one of the default servers and connect. It will connect to the mainnet.
1. The transaction list must be empty.
1. Go back, change again to the testnet server.
1. Before loading the wallet it must ask to confirm that you want to connect to a testnet. Check that all transactions load again.

### Add passphrase
1. Click on the settings icon and then 'Set a passphrase'.
1. Do not fill all fields and try to confirm. It must show an error.
1. Choose any passphrase and confirm it. It must show an empty list again.
1. Go back to the passprase screen and now select 'I want to set a blank passphrase.' and confirm it.
1. All transactions must appear again.

### Notifications and bug report
1. Click on the settings icon and 'Change' link on the 'Allow notifications' option. Click to change and see that now it's 'No'.
1. Do the same with the bug report to validate it's changing.

### Reload wallet
1. Turn wifi off until the status change to 'Offline'.
1. Turn on wifi and check if status change to 'Online' again and the wallet reload the transactions.
1. Click on 'Reset all data' and confirm it.
1. Now load the wallet with the saved words. All transactions must appear normally.

### Register tokens with same name
1. If the token `TST` is registered, unregister it.
1. Register the token `[Test token:TST:00000b83ed61b871336cbec7f459241aafcb034a9829d0f14f33008424057fa3:64e1ba0a]`
1. Try to register the token `[Test Token:TST:0000000a178b1a6fff36d24b19ffd8a268709235d9d522361db5a54b96384e96:5f21236b]`
1. Now click on 'Custom tokens', then 'Register a token'.
1. Type 'abc'. It should show an error of invalid configuration string.

### Try to spend same output
1. Go to the main screen, select the HTR token and copy the address (and save it).
1. Click on the first transaction with amount 0.00.
1. Copy the first input from HTR and from your address (copy the transaction ID and the index).
1. Click on `Send tokens`.
1. Paste the address and `1.00` as the amount. Deselect `Choose inputs automatically` and paste the transaction ID and index copied before.
1. Must see an error that the output is already spent.

### Create NFT
1. Click on `Custom tokens`, then `Create an NFT`.
1. Fill NFT data as `ipfs://test`, name and symbol as `NFT Test` and `NFTT`, and amount as `100`. Check only the melt authority checkbox.
1. Double check the Fee is `0.01` HTR, the deposit is `0.01` HTR and the Total is `0.02` HTR.
1. Create the NFT and open the transaction on the list.
1. Validate that the first output is the data output showing `ipfs://test [Data]` with `0.01` HTR and there is one output with `100` of tokens, one output with the melt authority and possibly one change output of HTR.

### Reset from the locked screen
1. Load your wallet again.
1. Close the wallet and re-open it.
1. Click the "Reset all data" button and proceed with the reset.
1. The wallet should validate the correct password and reset correctly.
1. Close the wallet.
1. Open it again: you should be on the "Welcome" screen.

### Reset menu
1. Reset the wallet and close it.
1. Open the wallet with the parameters `--unsafe-mode --hathor-debug` (see [the README.md](./README.md#debug-mode-on-installed-app) to understand how).
1. Click on the application menu Debug > Reset all data. Then fill the form with "anything" and click on the "Reset all data" button.
1. Check that a message with "Invalid value." appears.
1. Click on "Cancel", the modal should close.
1. Click on the application menu Debug > Reset all data. Then fill the form with "I want to reset my wallet" and click on the "Reset all data" button. The wallet should close.
1. Open the wallet again, it should open the Welcome screen. Do NOT click on "Get started".
1. This is to simulate a fresh install of the app. Close the wallet.

### Late backup
1. Open the app again and start a new wallet one without doing backup.
1. In the main screen it must show a yellow warning saying a backup must be done.
1. Do the backup (following procedures in the 'Initialization' tests).
1. The backup message has to disappear.

## QA for the Hardware Wallet (Ledger integration)
See the [QA_LEDGER.md](./QA_LEDGER.md) file for the Ledger specific tests.

## QA for the Wallet Service
See the [QA_WALLET_SERVICE.md](./QA_WALLET_SERVICE.md) file for the Wallet Service specific tests.

## QA for the Nano Contract
See the [QA_Nano.md](./QA_Nano.md) file for the Nano Contract specific tests.

## QA for Large Values
See the [QA_LARGE_VALUES.md](./QA_LARGE_VALUES.md) file for the Large Values specific tests that run in a dedicated local private network.


### Hardware wallet migration
1. Uninstall the wallet and install the previous version.
1. Connect your Ledger device to the computer. The Ledger should be initialized already.
1. Start the wallet with the Ledger device
1. Take note of the existing transactions and copy the current address.
1. Close the wallet and install the latest version.

### Hardware wallet initialization
1. Connect your Ledger device to the computer. The Ledger should be initialized already.
1. Open the Hathor app on Ledger.
1. Open the desktop wallet and choose to start a 'Hardware Wallet'.
1. Wallet should go through both steps and show 'Step 1/2' and 'Step 2/2'.
1. On your Ledger, check it is requesting your authorization.
   🚫**Deny** the authorization request on Ledger (scroll with left or right and click both buttons on "Reject" step). It should show an error on the wallet.
1. Click 'Try again'. It goes through both steps and asks for authorization again.
1. ✅**Grant** authorization request (click both buttons on the "Approve" step). It will proceed to 'Loading transactions' screen.
1. Once the wallet is loaded check that the current address match the copied address during "**Hardware wallet migration**"

### Ledger wallet screen
1. On the main wallet screen, confirm 'Address to receive tokens' is truncated (eg: `HGZmqThwa6...`). There should be a 'Show full address' button next to it.
1. Confirm there's no QR Code button under the truncated address.
1. Click on 'Show full address'. A modal will display asking you to compare the address on the wallet and on Ledger.
1. Check that the modal cannot be closed, not even by clicking outside it.
1. Confirm that both addresses (on wallet and Ledger) are the same. Copy this address on the computed.
1. On the Ledger click both buttons on the "Approve" step. Modal should close.
1. Send `10.00` HTR from another wallet to the copied address.
1. Check that the transaction appears in the list, the balance was updated and the address also changed.
1. Click on 'Generate new address' and validate it has changed.
1. Confirm again address on the wallet and on Ledger (by clicking 'Show full address').

### Ledger custom token wallet screen
1. On the main wallet screen get another address and send any amount of a custom token to this address.
1. Register the token and go to the token wallet screen.
1. Check that there is a key icon next to it's name and click the key icon.
1. A modal should appear, confirm that the token symbol, name and uid are correct.
1. Click the "Sign token" button and check the Ledger device, it should say "Confirm token data".
1. Confirm that the symbol, name and uid are correct (use buttons to scroll).
1. Click both buttons on the 🚫**Reject** step and check that an error message "User denied token on Ledger" appears on the wallet.
1. Try to sign the token again but this time click both buttons on the ✅**Accept** step, a success message should show on the wallet.
1. After closing the modal, check that the key icon is now an unclickable checkmark icon and hovering shows the message "Token signed with Ledger".

### Ledger reset token signature
1. Go to settings and click the button "Untrust all tokens on Ledger".
1. Read the message and click "Start", the device should show "Reset token signatures".
1. Click both buttons on the 🚫**Reject** step and check that an error message appears on the wallet.
1. Click the "Try again" button and this time click both buttons on the ✅**Accept** step.
1. Go to the token wallet screen and check that the checkmark icon is back to a key icon.

### Ledger send tokens
#### Invalid fields and errors
1. On the wallet screen copy 2 different addresses from your wallet.
1. Click on 'Send tokens' on the top menu.
1. Confirm that the token dropdown list can be clicked and show all tokens.
1. Confirm the Timelock checkbox is disabled.
1. Try sending a transaction to an invalid address. An error message should show up on the wallet. Nothing should be displayed on Ledger.
1. Try sending a transaction with an amount bigger than the one you have. An error message should show up on the wallet. Nothing should be displayed on Ledger.

#### Sending HTR
1. Send HTR tokens to both copied addresses in the same transaction (2 outputs). A modal will be displayed asking to confirm operation on Ledger.
1. On Ledger, it should show 'Output 1/2' on the first step the address on the second and the amount on the third step (steps being from left to right), then an "Approve" and "Reject" steps. After clicking both buttons on the "Approve", it shows 'Output 2/2' and the other output (address and amount).
1. Clicking both buttons on the "Approve" step one more time will display the confirmation screen.
1. 🚫**Reject** signing the transaction. The modal will hide and an error message should appear on the wallet.
1. Click to send the transaction again. This time, ✅**Approve** it on the signing screen.
1. Ledger screen will show 'Processing' for a while and the desktop wallet will display the modal while solving proof of work.
1. After transaction is completed, it closes the modal and goes back to main wallet screen. The first transaction on the list must have value 0.00.

#### Sending Custom Tokens
1. Go to the custom token wallet page and confirm that the key icon is showing next to the name (and not a checkmark).
1. If there is a checkmark icon, go to settings and untrust all tokens.
1. Click on 'Send tokens' on the top menu again.
1. Change the token dropdown to the custom token and try to send any amount. A modal will be displayed saying there are unverified custom tokens and the list should have the custom token added to the transaction.
1. Go to the custom token wallet screen and sign the custom token with Ledger (🗝️ key icon next to the name).
1. Go back to the 'Send tokens' screen and click on 'Add another token' button and send HTR to an address and the custom token to the second copied address. Make sure both amounts are less than the balance available. A modal will be displayed asking to confirm operation on Ledger.
1. On Ledger you should check that each token is being sent to the correct address then click both buttons on the ✅**Approve** screen.
1. After transaction is completed, it closes the modal and goes back to main wallet screen. The first transaction on the list must have value 0.00.
1. Click on the first transaction and confirm that it has 4 outputs. The extra 2 outputs are change outputs and should be marked with 'Your address'.
1. Close the wallet and open it again, check the custom token screen of the token used on the last transaction. Make sure that there is a ☑️ checkmark icon next to the token name.

### Ledger misc
1. Go to the Settings screen.
1. Click on change server. The usual Change Server screen should show up, but with no PIN field. Change to a new server.
1. On the settings screen, click on 'Set a passphrase'. It should show a modal saying the action is not supported and it should be done directly on Ledger.
1. Go to Custom Tokens on the top navigation bar. Clicking 'Create a new token' should display a modal saying action is not supported.
1. Now click on 'Create an NFT' and should display a modal saying action is not supported.
1. Lock wallet. It should go the screen asking to select the wallet type (software or hardware).
1. Choose 'Hardware Wallet' and go through the same process again.
1. When finished loading the wallet, it should show the same balance and transactions as before locking.

### Ledger connection
1. On Ledger, quit the Hathor app. The desktop wallet should lock (go to wallet type screen). This *does not* happen instantly.
1. Without opening the Hathor app on Ledger, click 'Hardware wallet'. Desktop wallet will stay on 'Step 1/2'.
1. Open the Hathor app on Ledger. Wallet should go to 'Step 2/2' after a few seconds and ask for authorization on Ledger.

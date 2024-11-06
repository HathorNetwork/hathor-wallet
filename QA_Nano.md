# Create Nano Contract
This test suite will execute the full flow of the [Bet blueprint](https://explorer.alpha.nano-testnet.hathor.network/blueprint/detail/3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595), ensuring all interface interaction is validated with its error handling cases.

More about Nano Contracts on our [official docs](https://docs.hathor.network/explanations/features/nano-contracts/).

# Initializing connection
- Open the Desktop Wallet with an existing seed
- Go to "Settings" and change its server to `https://hathorplay.nano-testnet.hathor.network/v1a/`
- Go to "Settings" and change its mining server to `https://txmining.nano-testnet.hathor.network/`
- Activate the `nano-contracts-desktop.rollout` feature toggle on unleash for this wallet's unique id
- Wait a while for the "Nano Contract" tab to appear at the navigation header

# Blueprint Selection
- Navigate to the "Nano Contract" tab
- Click the "Create a nano contract" button
- Write nothing and press "Fetch": the field should turn red
- Write a single letter and press "Fetch": there should be an error fetching blueprint information.
- Write the `Bet` blueprint id (`3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595`) and press "Fetch"
- The blueprint data should be displayed
- Click "Select New Blueprint": the screen and its input should now be empty again.
- Write the `Bet` blueprint id again
- Click "Confirm" and you should see the next screen for initialization

# Initialization
## Address to Sign
- Press "Create" without inserting any data: all fields should turn red
- Insert any invalid data into "Address to Sign" and press "Create". Validation should still be red
- Insert a valid address that is not from this wallet and press "Create". The validation persists.
- Paste an address from this wallet that you already know. The validation should pass with green color.
- Click "Select from a list" and select one of the addresses there. Validation still green.

## Oracle Script
- Insert "s" into this field. It should still be red.
- Insert "a". The field should turn green immediately, without need to press the "Create" button.
- Insert a valid script like `76a914db6fe378a8af070b332104c66c0a83dcb2d03e8b88ac`.

## Other fields
- Select any token from the list and it should become green.
- Select the empty value again and it should return to red.
- Select the HTR token.
- Insert an invalid date (31/Fev/1990). The date field should still be red.
- Insert a valid date in about 5 minutes in the future ( we will test this validation later ) and it should immediately become green.

## Creation
- Click "Create" and add an incorrect PIN on the modal: the "Invalid PIN" error should appear
- Insert the correct pin and click "Go".
- After a while, the NC should be created.
- A screen should be shown with the details of the nano contract. Copy its identifier for later tests.
- The three methods `bet`, `set_result` and `withdraw` should be shown

# Interacting with a Nano Contract
This first interaction should happen before the "Date of Last Bet", so that the bet is valid.

## Betting - Method Parameters
- On the Nano Contracts details screen, "Available Methods" section, click on `bet`
- Without inserting anything, click "Execute Method". All fields should become red.
- Insert an invalid address on the "Address" field and click "Execute". Should stay red.
- Insert a valid address from another wallet and click "Execute". Should become green.
- For testing purposes, insert an address from this wallet to continue the next steps.
- Insert `1` on the "Score" field and click "Execute"
- The PIN should be requested before any validation on the actions is made.
- Insert the correct pin and send the transaction. Check that it becomes voided because the action was missing.

## Betting - Action
- Select the `bet` method and fill all the fields again. Take note of the address used. 
- Select "Deposit" from the "Type" options
- Click "Execute" and check that the other fields become red
- Select any token and the field immediately turns green
- Insert any amount and the field immediately turns green too
- Click "Remove" and check that the whole row is removed.
- Create an action with the deposit of `0.01` HTR and click Execute.
- Now the Token Details screen should indicate the field `total` is `0.01`
- The "Balances" section should indicate a balance of `0.01` for token `00`

## Late betting
- We need a different valid bet to decide a winner, so create another bet with:
  - Another address from this same wallet
  - Score: `2`
  - Deposit value: `0.02` HTR
- The "Balances" section of the contract should indicate `0.03` for token `00`
- Now wait for a while until the timestamp informed for `date_last_bet`
- Create a new valid bet, and click "Execute". A message will appear informing of an error, and the transaction will not be processed.

## Setting Results
- Now, on "Nano Contract Detail" screen, select `set_result`
- Without filling any fields, click "Execute". The "result" field should become red.
- Enter any character in it and it should become green immediately
- Click "Select Address to Sign" and select the same address used as "Address to Sign" on initialization
- Click on "Sign Data" without filling any fields. They should become red.
- Insert `2` on "Data to Sign" and fill the wrong pin, then click "Sign Data". An "Invalid PIN" error should appear immediately
- Fill the correct PIN and click "Sign Data". You should be back at the "Execute Method" screen with a hashed result on the "result" field
- Click "Execute Method" and add the correct PIN
- On the detail screen, the `final_result` field should be filled with `1`

## Withdrawing the prize
- Navigate to the "Nano Contract Detail" screen
- Click on the "Address" field and change it to the address of the winning bet
- Back on the "Nano Contract Detail" screen, select the "withdraw" method
- Fill no actions and click "Execute Method", insert the pin and check that the generated transaction is voided
- Select "Withdraw" from the "Type" options
- Click "Execute" and check that the other fields become red
- Select any token and the field immediately turns green
- Insert any amount and the field immediately turns green too
- Click "Remove" and check that the whole row is removed.
- Create an action with the withdrawal of `0.03` HTR to the address that voted on result `1`.
- Execute the method and check that the transaction was successful
- Click on the transaction details and confirm that the output of `0.03` HTR was sent to the correct address

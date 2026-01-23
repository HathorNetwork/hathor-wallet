# Creating a `Bet` Nano Contract
This test suite will execute the full flow of the [Bet blueprint](https://explorer.testnet.hathor.network/blueprint/detail/000001291ad6218140ef41eef71f3c2fbeb000f6ddd592bc42c6cde9fa07a964), ensuring all interface interaction is validated with its error handling cases.

More about Nano Contracts on our [official docs](https://docs.hathor.network/explanations/features/nano-contracts/).

Ideally the test will use two devices connected to Hathor Wallets. One is this device that is being tested, and the other one should be any stable Hathor Wallet (Desktop or Mobile) that will be used to create different bets and interact with this created contract.

### Initializing connection
1. Open the Desktop Wallet with an existing seed
1. Switch the server to `testnet`.
1. See that the "Nano Contract" tab appears at the navigation header

## Blueprint Selection
1. Navigate to the "Nano Contract" tab
1. Click the "Create a nano contract" button
1. Write nothing and press "Fetch": the field should turn red
1. Write a single letter and press "Fetch": there should be an error fetching blueprint information.
1. Write the `Bet` blueprint id (`000001291ad6218140ef41eef71f3c2fbeb000f6ddd592bc42c6cde9fa07a964`) and press "Fetch"
1. The blueprint data should be displayed
1. Click "Select New Blueprint": the screen and its input should now be empty again.
1. Write the `Bet` blueprint id again
1. Click "Confirm" and you should see the next screen for initialization

## Initialization
Before starting this step, take note of one of the addresses from this wallet that is not the current address ( see the "See all addresses" screen ).

### Address to Sign
1. Press "Create" without inserting any data: all fields should turn red
1. Insert any invalid data into "Address to Sign" and press "Create". Validation should still be red
1. Insert a valid address from the _other test wallet_ and press "Create". The validation persists.
1. Paste the previously noted address from _this wallet_. The validation should pass with green color.
1. Click "Select from a list" and select one of the addresses there. Validation still green.

### Oracle Script
1. Insert "s" into this field. It should still be red.
1. Insert "a". The field should turn green immediately, without need to press the "Create" button.
1. Generate an oracle script using the code in the annex at the end of this QA file, using the address selected above and the correct network.

### Other fields
1. Select any token from the list and it should become green.
1. Select the empty value again and it should return to red.
1. Select the HTR token.
1. Insert an invalid date (31/Fev/1990). The date field should still be red.
1. Insert a valid date in about 5 minutes in the future ( we will test this validation later ) and it should immediately become green.

## Creation
1. Click "Create" and add an incorrect PIN on the modal: the "Invalid PIN" error should appear
1. Insert the correct pin and click "Go".
1. After a while, the NC should be created.
1. A screen should be shown with the details of the nano contract. Copy its identifier for later tests.
1. The three methods `bet`, `set_result` and `withdraw` should be shown

# Interacting with a Nano Contract
This first interaction should happen before the "Date of Last Bet", so that the bet is valid.

## Betting - Method Parameters
1. On the Nano Contracts details screen, "Available Methods" section, click on `bet`
1. Without inserting anything, click "Execute Method". All fields should become red.
1. Insert an invalid address on the "Address" field and click "Execute". Should stay red.
1. Insert a valid address from another wallet and click "Execute". Should become green.
1. For testing purposes, insert an address from this wallet to continue the next steps.
1. Insert `1` on the "Score" field and click "Execute"
1. The PIN should be requested before any validation on the actions is made.
1. Insert the correct pin and send the transaction. Check that it becomes voided because the action was missing.

## Betting - Action
1. Select the `bet` method and fill all the fields again. Take note of the address used. 
1. Select "Deposit" from the "Type" options
1. Click "Execute" and check that the other fields become red
1. Select any token and the field immediately turns green
1. Insert any amount and the field immediately turns green too
1. Click "Remove" and check that the whole row is removed.
1. Create an action with the deposit of `0.01` HTR and click Execute.
1. Now the Token Details screen should indicate the field `total` is `0.01`
1. The "Balances" section should indicate a balance of `0.01` for token `00`

### Second bet and late betting
1. We need a different valid bet to decide a winner, so create another bet with:
  1. Another address from this same wallet
  1. Score: `2`
  1. Deposit value: `0.02` HTR
1. The "Balances" section of the contract should indicate `0.03` for token `00`
1. Now wait for a while until the timestamp informed for `date_last_bet`
1. Create a new valid bet, and click "Execute". A message will appear informing of an error, and the transaction will not be processed.

## Setting Results
1. Now, on "Nano Contract Detail" screen, select `set_result`
1. Without filling any fields, click "Execute". The "result" field should become red.
1. Enter any character in it and it should become green immediately
1. Click "Select Address to Sign" and select the same address used to generate the oracle script at initialization
1. Click on "Sign Data" without filling any fields. They should become red.
1. Insert `1` on "Data to Sign" and fill the wrong pin, then click "Sign Data". An "Invalid PIN" error should appear immediately
1. Fill the correct PIN and click "Sign Data". You should be back at the "Execute Method" screen with a hashed result on the "result" field
1. Click "Execute Method" and add the correct PIN
1. On the detail screen, the `final_result` field should be filled with `1`

## Withdrawing the prize
1. Navigate to the "Nano Contract Detail" screen
1. Click on the "Address" field and change it to the address of the winning bet
1. Back on the "Nano Contract Detail" screen, select the "withdraw" method
1. Fill no actions and click "Execute Method", insert the pin and check that the generated transaction is voided
1. Select "Withdraw" from the "Type" options
1. Click "Execute" and check that the other fields become red
1. Select any token and the field immediately turns green
1. Insert any amount and the field immediately turns green too
1. Click "Remove" and check that the whole row is removed.
1. Create an action with the withdrawal of `0.03` HTR to the address that voted on result `1`.
1. Execute the method and check that the transaction was successful
1. Click on the transaction details and confirm that the output of `0.03` HTR was sent to the correct address

# Annexes
### Generating scripts
To generate the oracle script for an address/network, use the sample script below, replacing the variable contents accordingly:
```mjs
import hl from '@hathor/wallet-lib';

const oracleAddress = 'WYLW8ujPemSuLJwbeNvvH6y7nakaJ6cEwT';
const networkName = 'testnet';
const oracleScript = hl.nanoUtils.getOracleBuffer(oracleAddress, new hl.Network(networkName)).toString('hex')

console.log(oracleScript);
```

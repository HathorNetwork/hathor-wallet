# QA with large output values

## Setup

1. Run `npm run qa_network_up`. This will run a docker compose with a full node in a custom network, a tx-mining-service, and a CPU miner.
2. Start the wallet with this seed: `avocado spot town typical traffic vault danger century property shallow divorce festival spend attack anchor afford rotate green audit adjust fade wagon depart level` (same as in `qa/large-values-network/privnet.yml`)
3. Go to settings, "Change network", select "Custom network" and configure:
   1. Full node URL: `http://localhost:8083/v1a/`
   2. Transaction Mining Service URL: `http://localhost:8035/`
   3. Explorer URL: `https://explorer.testnet.hathor.network` (same as testnet — we don't use it in this QA)
   4. Explorer Service URL: `https://explorer-service.testnet.hathor.network/` (same as testnet — we don't use it in this QA)

## Checks

1. Check that the total available is exactly `92,233,720,368,547,758.00 HTR`.
2. Check that a simple transaction can be sent
   1. Copy an address from this wallet.
   2. Go to the "Send Tokens" tab and create a transaction to that address.
   3. Copy the "Balance available" value, paste it in the value input, and send the transaction.
   4. The transaction should be successfully created. Return to the main screen.
   5. The balance should remain `92,233,720,368,547,758.00 HTR`, and a new transaction with value `0.00` should appear in the history.
3. Check that a custom token can be created with the maximum output value
   1. Go to the "Custom tokens" tab.
   2. Type any "Short name" and "Symbol".
   3. Put exactly `9223372036854775808` as the "Amount". This is `2^63`, which is the maximum value an output can hold. It should appear as `92,233,720,368,547,758.08` in the input.
   4. The deposit should appear as exactly `922,337,203,685,477.60 HTR`. It's not precisely 1% of the requested amount, this is expected. For more information, see [this](https://github.com/HathorNetwork/hathor-wallet-lib/blob/c06d3ce7132efb6e28fe507e94bbc585b65c3d94/src/utils/tokens.ts#L274-L277).
   5. Create the token, and the transaction should be successfully created. Return to the main screen.
   6. Go to your newly created token's tab, and check that the total available is exactly `92,233,720,368,547,758.08`. It should contain one transaction in the history with `92,233,720,368,547,758.08` as the value. 
   7. Go to the HTR tab, the total available should be exactly `91,311,383,164,862,280.40`, and a new transaction with value `-922,337,203,685,477.60` should appear in the history.
4. Run automated checking script. This is like an integration test, the goal is to check that transactions were created with the correct values in the full node, and that we're not being tricked by display values that may accidentally look the same as the correct value in the wallet.
   1. Run `python ./qa/large-values-network/checks.py`.
   2. Make sure it outputs `Checks executed successfully.`

## Tear down

1. Run `npm run_qa_network_down`.
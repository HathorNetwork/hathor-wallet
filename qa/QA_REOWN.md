# QA Reown

This document outlines the testing flow for the Desktop Wallet using an RPC interface. Each section contains the request payload, instructions on how to obtain the necessary data and expected response structure.
 
- **Testing Environment:** https://staging.betting.hathor.network/rpc
- **Network:** Testnet
- **Explorer for validations:** https://explorer.testnet.hathor.network

Navigate to the testing environment above (or raise a development environment of your choice) and use the *Requests* to generate the expected *Responses* described below.

After each request look closely at the confirmation screen, making sure all the request data is properly displayed.
- *Always reject the first request* you make for each step
- Make sure the rejection process has the correct behavior
- Only then proceed to making the actual request to receive the validation response

On the screens that have a selectable response, look closely at the response data to ensure the selected elements were sent correctly.

---
# Initial connection

1. Open the testing environment and click "Connect Wallet"
1. On the Desktop Wallet initial screen (Dashboard), click the "Settings" button on the bottom left corner
1. On the "Reown" section, click "Manage Sessions" and "Add New Connection"
1. Copy the Connection String on the testing environment
1. Paste the string on the "New Connection" "dApp URI" field on the Desktop Wallet
1. Reject the connection and check that the testing environment just closes the QR Code modal
1. Start again but this time connect your wallet
1. Check the testing dApp is now connected to your wallet through the "Hathor Bet" ReOwn session on the Wallet

# Basic Wallet Interaction
Retrieving data, signing messages and sending basic transactions.

## Get Wallet Information
Just execute this request and have the Wallet app opened to automatically retrieve this data. No approval is necessary by the user.

### Request
```json
{
  "method": "htr_getWalletInformation",
  "params": {
    "network": "testnet"
  }
}
```

### Response
```json
{
  "type": 12,
  "response": {
    "network": "testnet",
    "address0": "{base58 address}"
  }
}
```

## Get Connected Network
Just execute this request and have the Wallet app opened to automatically retrieve this data. No approval is necessary by the user.

### Request
```json
{
  "method": "htr_getConnectedNetwork",
  "params": {
    "network": "testnet"
  }
}
```

### Response
```json
{
  "type": 4,
  "response": {
    "network": "testnet",
    "genesisHash": ""
  }
}
```

## Get Addresses
Addresses may be retrieved in three different ways. For each one, see that the user interface displays the dApp request accordingly.

### Request (1) - First empty
The requested address will probably have a high index.
```json
{
  "method": "htr_getAddress",
  "params": {
    "network": "testnet",
    "type": "first_empty"
  }
}
```

#### Response
```json
{
  "type": 2,
  "response": {
    "address": "{base58 address}",
    "index": 1234,
    "addressPath": "m/44'/280'/0'/0/1234"
  }
}
```

### Request (2) - By index
The address index must be respected here.
```json
{
  "method": "htr_getAddress",
  "params": {
    "network": "testnet",
    "type": "index",
    "index": 3
  }
}
```

#### Response
```json
{
  "type": 2,
  "response": {
    "address": "{base58 address}",
    "index": 3,
    "addressPath": "m/44'/280'/0'/0/1234"
  }
}
```

### Request (3) - By client
The user will select the desired address from a list.
```json
{
  "method": "htr_getAddress",
  "params": {
    "network": "testnet",
    "type": "client"
  }
}
```

#### Response
```json
{
  "type": 2,
  "response": {
    "address": "{base58 address}",
    "index": 1234,
    "addressPath": "m/44'/280'/0'/0/1234"
  }
}
```

## Get UTXOs
All the request parameters should be displayed clearly to the user on the confirmation screen.

The query result must also be summarized for double-checking on the response message.

### Request
```json
{
  "method": "htr_getUtxos",
  "params": {
    "network": "testnet",
    "token": "00",
    "maxUtxos": 2,
    "amountSmallerThan": 1000,
    "amountBiggerThan": 10
  }
}
```

### Response
```json
{
  "type": 5,
  "response": {
    "total_amount_available": "123456",
    "total_utxos_available": "12",
    "total_amount_locked": "34",
    "total_utxos_locked": "56",
    "utxos": [
      {
        "address": "{base58 address}",
        "amount": "123",
        "tx_id": "{64-char tx hash}",
        "locked": false,
        "index": 0
      },
      {
        "address": "{base58 address}",
        "amount": "456",
        "tx_id": "{64-char tx hash}",
        "locked": true,
        "index": 1
      }
    ]
  }
}
```

## Send Transaction
Sends a simple transaction.
Here we explicitly request NOT to send the transaction first, and then send the transaction. On later requests we will consider this switching implicit for the tests.

After the successful response, open the Testnet Explorer and validate the transaction results with the response received.

### Request (1) - Building and not pushing
```json
{
  "method": "htr_sendTransaction",
  "params": {
    "network": "testnet",
    "push_tx": false,
    "outputs": [
      {
        "address": "{one of your addresses, fetched above}",
        "value": "1"
      }
    ]
  }
}
```

#### Response
```json
{
  "type": 8,
  "response": "{ a long hexadecimal }"
}
```

### Request (2) - Pushing the TX
```json
{
  "method": "htr_sendTransaction",
  "params": {
    "network": "testnet",
    "push_tx": true,
    "outputs": [
      {
        "address": "{one of your addresses, fetched above}",
        "value": "1"
      }
    ]
  }
}
```

#### Response
```json
{
  "type": 8,
  "response": {
    "inputs": [
      {
        "hash": "{ 64-char tx hash }",
        "index": 1,
        "data": {
          "type": "Buffer",
          "data": [4, 5, 6, "..."]
        }
      }
    ],
    "outputs": [
      {
        "value": "1",
        "tokenData": 0,
        "script": {
          "type": "Buffer",
          "data": [1, 2, 3, "..."]
        },
        "decodedScript": {
          "address": {
            "base58": "{your-address}",
            "network": {
              "name": "testnet",
              "versionBytes": {
                "p2pkh": 44,
                "p2sh": 33,
                "xpriv": 22,
                "xpub": 11
              },
              "bitcoreNetwork": {
                "name": "htr-testnet",
                "alias": "test",
                "pubkeyhash": 99,
                "privatekey": 88,
                "scripthash": 77,
                "bech32prefix": "tn",
                "xpubkey": 66,
                "xprivkey": 55,
                "networkMagic": {
                  "type": "Buffer",
                  "data": [7, 8, 9, "..."]
                },
                "port": 9876,
                "dnsSeeds": []
              }
            }
          },
          "timelock": null
        }
      }
    ],
    "signalBits": 0,
    "version": 1,
    "weight": 17.1097527195551,
    "nonce": 162898,
    "timestamp": 123456,
    "parents": [
      "{ 64-char tx hash }",
      "{ 64-char tx hash }"
    ],
    "tokens": [],
    "hash": "{ 64-char tx hash }",
    "headers": [],
    "_dataToSignCache": {
      "type": "Buffer",
      "data": [1, 2, 3, "..."]
    }
  }
}
```


### Request (3) - Sending a data output
```json
{
  "method": "htr_sendTransaction",
  "params": {
    "network": "testnet",
    "push_tx": true,
    "outputs": [
      {
        "data": "Test data output"
      }
    ]
  }
}
```

## Sign with Address
Tests the message signing functionality using a wallet address by index.

### Request
```json
{
  "method": "htr_signWithAddress",
  "params": {
    "network": "testnet",
    "message": "Hello, Hathor!",
    "addressIndex": 0
  }
}
```

### Expected Response
```json
{
  "type": 1,
  "response": {
    "message": "Hello, Hathor!",
    "signature": "{ a long string }",
    "address": {
      "address": "{ your address at the selected index }",
      "index": 0,
      "addressPath": "m/44'/280'/0'/0/0"
    }
  }
}
```

---

## Create Token
Creates a custom token on the Hathor testnet with mint and melt authorities.

1. Check that the request confirmation screen shows all token information correctly
1. Confirm the transaction request and check the custom token now exists on the Explorer

### Request (1) - Creation success
```json
{
  "method": "htr_createToken",
  "params": {
    "network": "testnet",
    "name": "Test Token",
    "symbol": "TST",
    "amount": "100",
    "create_mint": true,
    "create_melt": true,
    "allow_external_mint_authority_address": false,
    "allow_external_melt_authority_address": false
  }
}
```

#### Expected Response
```json
{
  "type": 6,
  "response": {
    "inputs": [
      {
        "hash": "{64-char tx hash}",
        "index": 0,
        "data": {
          "type": "Buffer",
          "data": [1 , 2, 3, "..."]
        }
      }
    ],
    "outputs": [
      {
        "value": "100",
        "tokenData": 1,
        "script": {
          "type": "Buffer",
          "data": [4, 5, 6, "..."]
        }
      },
      {
        "value": "1",
        "tokenData": 129,
        "script": {
          "type": "Buffer",
          "data": [7, 8, 9, "..."]
        }
      },
      {
        "value": "2",
        "tokenData": 129,
        "script": {
          "type": "Buffer",
          "data": [10, 11, 12, "..."]
        }
      }
    ],
    "hash": "{64-char tx hash}",
    "name": "Test Token",
    "symbol": "TST"
  }
}
```

### Request (2) - Invalid mint address
Try to create a custom token with `create_mint: false` and a mint address, resulting in an invalid request that the wallet cannot complete.

Validate the information the wallet offers to the user.
```json
{
  "method": "htr_createToken",
  "params": {
    "network": "testnet",
    "name": "Test Token",
    "symbol": "TST",
    "amount": "100",
    "create_mint": false,
    "create_melt": true,
    "mint_authority_address": "{your-address}",
    "allow_external_mint_authority_address": false,
    "allow_external_melt_authority_address": false
  }
}
```

There is no response for this request: the user is forced to reject it.

### Request (3) - Invalid external mint address
Try to create a custom token with `allow_external_mint_authority_address: false` and an external mint address, resulting in an invalid request that the wallet cannot complete.

Validate the information the wallet offers to the user.

To fetch an external address you may check the Explorer, looking for any transaction there and copying one from its inputs/outputs.
```json
{
  "method": "htr_createToken",
  "params": {
    "network": "testnet",
    "name": "Test Token",
    "symbol": "TST",
    "amount": "100",
    "create_mint": true,
    "create_melt": true,
    "mint_authority_address": "{an-external-address}",
    "allow_external_mint_authority_address": false,
    "allow_external_melt_authority_address": false
  }
}
```

---

# Betting NanoContract
The following sections will create a full interaction with the Bet Blueprint:
- Initializing the bet NC
- Making a first bet
- Signing the Oracle data
- Setting the result with the oracle data
- Withdrawing the prize from the winning bet

It is advisable to *only use the address at index 0 for all operations*, as some of the RPC requests are hardcoded to use this address index only.

## Bet Initialize

### Prerequisite
The user needs to calculate the oracle buffer. This can be done through the following javascript call to the Wallet Lib:
```js
import { nanoUtils, Network } from '@hathor/wallet-lib';

/**
 * Converts an oracle address to a buffer hex string
 * Used in Initialize Bet RPC to convert oracle address parameter
 */
function getOracleBuffer(address: string): string {
  const network = new Network('testnet');
  return nanoUtils.getOracleBuffer(address, network).toString('hex');
}

const myFirstAddress = '{your-address-0}'
console.log(`Oracle buffer: ${getOracleBuffer(myFirstAddress)}`);
```

### Request
Here we will need to test both the pushing and not pushing the transaction, changing only the `push_tx` property of the request.

- Confirm that the Blueprint ID matches the request
- Save the `hash` value - this becomes the `nc_id` for subsequent operations

```json
{
  "method": "htr_sendNanoContractTx",
  "params": {
    "network": "testnet",
    "method": "initialize",
    "blueprint_id": "{64-char tx hash for the Bet Blueprint}",
    "actions": [],
    "args": [
      "{oracle-buffer for the oracle address}",
      "00",
      "{timestamp for last bet, in unix format}"
    ],
    "push_tx": false,
    "nc_id": null
  }
}
```

### Expected Response
When not pushing the tx, the response property will be a long string.
```json
{
  "type": 0,
  "response": {
    "hash": "{64-char tx hash}",
    "headers": [
      {
        "id": "{64-char tx hash for the Bet Blueprint}",
        "method": "initialize",
        "args": {
          "type": "Buffer",
          "data": [1, 2, 3, "..."]
        }
      }
    ]
  }
}
```

## Bet Deposit
Once the nano contract is initialized, place a single bet in it.
Here we will bet in the `Result_1` value, and the next requests will set this as the winner.

### Request
Here we will need to test both the pushing and not pushing the transaction, changing only the `push_tx` property of the request.
```json
{
  "method": "htr_sendNanoContractTx",
  "params": {
    "network": "testnet",
    "method": "bet",
    "nc_id": "{ nano contract id generated above }",
    "actions": [
      {
        "type": "deposit",
        "token": "00",
        "amount": "1",
        "changeAddress": "{ your address 0 }"
      }
    ],
    "args": [
      "{ your address 0 }",
      "Result_1"
    ],
    "push_tx": false
  }
}
```

### Response
When not pushing the tx, the response property will be a long string.
```json
{
  "type": 0,
  "response": {
    "inputs": [
      {
        "hash": "{64-char tx hash}",
        "index": 1,
        "data": {
          "type": "Buffer",
          "data": [1, 2, 3, "..."]
        }
      }
    ],
    "outputs": [
      {
        "value": "5",
        "tokenData": 0,
        "script": {
          "type": "Buffer",
          "data": [4, 5, 6, "..."]
        },
        "decodedScript": null
      }
    ],
    "signalBits": 0,
    "version": 1,
    "weight": 18.1846978319466,
    "nonce": 2164846482,
    "timestamp": 1234,
    "parents": [
      "{64-char tx hash}",
      "{64-char tx hash}"
    ],
    "tokens": [],
    "hash": "{64-char tx hash}",
    "headers": [
      {
        "id": "{ nano contract id generated above }",
        "method": "bet",
        "args": {
          "type": "Buffer",
          "data": [7, 8, 9, "..."]
        },
        "actions": [
          {
            "type": 1,
            "amount": "1",
            "tokenIndex": 0
          }
        ],
        "address": {
          "base58": "{ your address 0 }",
          "network": {
            "name": "testnet",
            "versionBytes": {
              "p2pkh": 123,
              "p2sh": 456,
              "xpriv": 789,
              "xpub": 101112
            },
            "bitcoreNetwork": {
              "name": "htr-testnet",
              "alias": "test",
              "pubkeyhash": 987,
              "privatekey": 654,
              "scripthash": 321,
              "bech32prefix": "tn",
              "xpubkey": 121110,
              "xprivkey": 151413,
              "networkMagic": {
                "type": "Buffer",
                "data": [1, 2, 3, "..."]
              },
              "port": 9876,
              "dnsSeeds": []
            }
          }
        },
        "seqnum": 181716,
        "script": {
          "type": "Buffer",
          "data": [4, 5, 6, "..."]
        }
      }
    ],
    "_dataToSignCache": {
      "type": "Buffer",
      "data": [7, 8, 9, "..."]
    }
  }
}
```

## Set Bet Result
Sets the bet result to `Result_1`, so that the bet above is the winner.

### Request 1 - Sign Oracle Data
The confirmation screen on the Desktop Wallet should display the oracle data both unencrypted (`Result_1`) and encrypted ( the hexadecimal signature that will be displayed on the response )

It is necessary to first sign the oracle data for it to be applied to the bet nano contract. Only then we can set the bet result in the next request.

```json
{
  "method": "htr_signOracleData",
  "params": {
    "network": "testnet",
    "nc_id": "{ nano contract id generated above }",
    "data": "Result_1",
    "oracle": "{your-address-0}"
  }
}
```

#### Response for oracle data
```json
{
  "type": 7,
  "response": {
    "data": "1x0",
    "signedData": {
      "type": "str",
      "signature": "{ a long hexadecimal string }",
      "value": "Result_1"
    },
    "oracle": "{your-address-0}"
  }
}
```

### Request 2 - Set Bet Result
The confirmation screen here will only display the encrypted signature, not the human-readable bet result.

Here we will need to test both the pushing and not pushing the transaction, changing only the `push_tx` property of the request.

```json
{  
  "method": "htr_sendNanoContractTx",  
  "params": {  
    "network": "testnet",  
    "method": "set_result",  
    "nc_id": "{ nano contract id generated above }",  
    "actions": [],  
    "args": [  
      {  
        "type": "str",  
        "signature": "{ the hexadecimal string generated above }",  
        "value": "Result_1"  
      }
    ],  
    "push_tx": false  
  }  
}
```

#### Response for set result
When not pushing the tx, the response property will be a long string.

```json
{
  "type": 0,
  "response": {
    "inputs": [],
    "outputs": [],
    "signalBits": 0,
    "version": 1,
    "weight": 17.693874101233863,
    "nonce": 148513,
    "timestamp": 1234,
    "parents": [
      "{64-char tx hash}",
      "{64-char tx hash}"
    ],
    "tokens": [],
    "hash": "{64-char tx hash}",
    "headers": [
      {
        "id": "{ nano contract id generated above }",
        "method": "set_result",
        "args": {
          "type": "Buffer",
          "data": [1, 2, 3, "..."]
        },
        "actions": [],
        "address": {
          "base58": "{your-address-0}",
          "network": {
            "name": "testnet",
            "versionBytes": {
              "p2pkh": 1,
              "p2sh": 2,
              "xpriv": 3,
              "xpub": 4
            },
            "bitcoreNetwork": {
              "name": "htr-testnet",
              "alias": "test",
              "pubkeyhash": 1,
              "privatekey": 2,
              "scripthash": 3,
              "bech32prefix": "tn",
              "xpubkey": 4,
              "xprivkey": 5,
              "networkMagic": {
                "type": "Buffer",
                "data": [4, 5, 6, "..."]
              },
              "port": 1234,
              "dnsSeeds": []
            }
          }
        },
        "seqnum": 2,
        "script": {
          "type": "Buffer",
          "data": [7, 8, 9, "..."]
        }
      }
    ],
    "_dataToSignCache": {
      "type": "Buffer",
      "data": [9, 8, 7, "..."]
    }
  }
}
```

## Bet Withdraw
Withdraws the prize from the initialized bet NC back to a wallet address.

### Request
Here we will need to test both the pushing and not pushing the transaction, changing only the `push_tx` property of the request.
```json
{
  "method": "htr_sendNanoContractTx",
  "params": {
    "network": "testnet",
    "method": "withdraw",
    "nc_id": "{ nano contract id generated above }",
    "actions": [
      {
        "type": "withdrawal",
        "address": "{your-address-0}",
        "amount": "1",
        "token": "00",
        "changeAddress": "{your-address-0}"
      }
    ],
    "args": [],
    "push_tx": false
  }
}
```

### Expected Response
When not pushing the tx, the response property will be a long string.
```json
{
  "type": 0,
  "response": {
    "inputs": [],
    "outputs": [
      {
        "value": "1",
        "tokenData": 0,
        "script": {
          "type": "Buffer",
          "data": [1, 2, 3, "..."]
        },
        "decodedScript": null
      }
    ],
    "signalBits": 0,
    "version": 1,
    "weight": 17.181848542924126,
    "nonce": 2862663316,
    "timestamp": 123456,
    "parents": [
      "{64-char tx hash}",
      "{64-char tx hash}"
    ],
    "tokens": [],
    "hash": "{64-char tx hash}",
    "headers": [
      {
        "id": "{ nano contract id generated above }",
        "method": "withdraw",
        "args": {
          "type": "Buffer",
          "data": [
            0
          ]
        },
        "actions": [
          {
            "type": 2,
            "amount": "1",
            "tokenIndex": 0
          }
        ],
        "address": {
          "base58": "{your-address-0}",
          "network": {
            "name": "testnet",
            "versionBytes": {
              "p2pkh": 1,
              "p2sh": 2,
              "xpriv": 3,
              "xpub": 4
            },
            "bitcoreNetwork": {
              "name": "htr-testnet",
              "alias": "test",
              "pubkeyhash": 5,
              "privatekey": 6,
              "scripthash": 7,
              "bech32prefix": "tn",
              "xpubkey": 8,
              "xprivkey": 9,
              "networkMagic": {
                "type": "Buffer",
                "data": [10, 11, 12, "..."]
              },
              "port": 9876,
              "dnsSeeds": []
            }
          }
        },
        "seqnum": 3,
        "script": {
          "type": "Buffer",
          "data": [1, 2, 3, "..."]
        }
      }
    ],
    "_dataToSignCache": {
      "type": "Buffer",
      "data": [4, 5, 6, "..."]
    }
  }
}
```

## Bet initialize with a custom token
The objective of this test is to try and send a custom token using a Nano Contract when the token is unregistered in the wallet, and check the flow to register it after the transaction.

1. Take note of the custom token UIDs created on the main QA tests
1. Unregister one of them from this wallet
1. Using the request for `Bet Initialize` above, initialize a Bet Blueprint with this custom token that has just been unregistered.
   1. Check that the request confirmation screen does not show the token name, just the UID, so no registration is offered
1. Now try to `Bet Deposit`, depositing 1 unit of the custom token
   1. You can set the `push_tx` parameter to `false` to just experiment without actually sending tokens
1. In the action list of the Request confirmation screen, check that the symbol of the custom token appears, with a tooltip to click on
1. Click the tooltip and check that the full token information is shown, with a "Tap to copy" link.
1. Confirm the transaction request
1. Check that a screen is displayed on transaction success asking the user if they want to register the unregistered tokens
1. Reject the registration and check the token is not registered
1. Send the custom tokens again using the Nano Contract
1. Accept the registration and check the custom token is now registered

---

# 📋 General Testing Notes

### Common Issues
- Mistakes in copy-pasting addresses, hashes and tx-ids are the most common
- Trying to send transactions with `pushTx` set to `false`


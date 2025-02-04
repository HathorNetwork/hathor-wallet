import json
import urllib.request
import traceback
import math

FULL_NODE_PORT = 8083
FULL_NODE_URL = f'http://localhost:{FULL_NODE_PORT}/v1a'
TX_COUNT = 2
TX_API_URL = f'{FULL_NODE_URL}/transaction?type=tx&count={TX_COUNT}'

GREEN_COLOR = '\033[92m'
RED_COLOR = '\033[91m'
NO_COLOR = '\033[0m'

DECIMAL_PLACES = 2
MAX_OUTPUT_VALUE = 2 ** 63
ALL_TOKENS = (MAX_OUTPUT_VALUE // (10 ** DECIMAL_PLACES)) * (10 ** DECIMAL_PLACES)
TOKEN_DEPOSIT_PERCENTAGE = 0.01
DEPOSIT_AMOUNT = math.ceil(ALL_TOKENS * TOKEN_DEPOSIT_PERCENTAGE)
CHANGE_AMOUNT = ALL_TOKENS - DEPOSIT_AMOUNT


def print_with_color(text: str, color: str) -> None:
    print(f'{color}{text}{NO_COLOR}')

def run_checks() -> None:
    with urllib.request.urlopen(TX_API_URL) as response:
        data = response.read().decode('utf-8')
        json_dict = json.loads(data)

        print('Checking transaction list...', end=' ')
        txs = json_dict['transactions']
        assert len(txs) == 2, 'expected 2 transactions'
        print_with_color('success', GREEN_COLOR)
        tx0, tx1 = txs

        print('Checking first transaction...', end=' ')
        tx1_inputs = tx1['inputs']
        tx1_outputs = tx1['outputs']
        assert len(tx1_inputs) == 1 and len(tx1_outputs), 'expected 1 input and 1 output'
        assert tx1_inputs[0]['value'] == ALL_TOKENS and tx1_outputs[0]['value'] == ALL_TOKENS, f'expected value to be {ALL_TOKENS}'
        print_with_color('success', GREEN_COLOR)

        print('Checking second transaction...', end=' ')
        tx0_id = tx0['tx_id']
        tx0_inputs = tx0['inputs']
        tx0_outputs = tx0['outputs']
        assert len(tx0_inputs) == 1, 'expected 1 input'
        assert len(tx0_outputs) == 4, 'expected 4 outputs'
        assert tx0_inputs[0]['value'] == ALL_TOKENS, f'expected single input to contain {ALL_TOKENS} HTR'
        assert tx0_outputs[0]['token'] == '00', f'expected first output to be HTR'
        assert tx0_outputs[0]['value'] == CHANGE_AMOUNT, f'expected first output to contain {CHANGE_AMOUNT} HTR (the change)'
        assert tx0_outputs[1]['token'] == tx0_id, f'expected second output to be the custom token'
        assert tx0_outputs[1]['value'] == MAX_OUTPUT_VALUE, f'expected second output to contain {MAX_OUTPUT_VALUE} custom tokens'
        print_with_color('success', GREEN_COLOR)

try:
    run_checks()
    print_with_color('Checks executed successfully.', GREEN_COLOR)
except:
    print('\n')
    traceback.print_exc()
    print_with_color('\nSome checks failed.', RED_COLOR)

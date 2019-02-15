import wallet from '../utils/wallet';
import dateFormatter from '../utils/date';

test('Get wallet balance', () => {
  // Create unspentTxs with two different tokens and some locked
  let unspentTxs = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': {
        'address': '1PtH3rBmiYDiUuomQyoxMREicrxjg3LA5q',
        'value': 100,
        'timelock': null,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f,0': {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 200,
        'timelock': dateFormatter.dateToTimestamp(new Date()) - 99999,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 500,
        'timelock': dateFormatter.dateToTimestamp(new Date()) + 99999,
      }
    },
    '01': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': {
        'address': '1PtH3rBmiYDiUuomQyoxMREicrxjg3LA5q',
        'value': 300,
        'timelock': null,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f,0': {
        'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
        'value': 100,
        'timelock': dateFormatter.dateToTimestamp(new Date()) - 99999,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 1000,
        'timelock': dateFormatter.dateToTimestamp(new Date()) + 99999,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295c,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 50,
        'timelock': dateFormatter.dateToTimestamp(new Date()) + 99999,
      }
    }
  }

  let balance = wallet.calculateBalance(unspentTxs);
  let expectedBalance = {
    '00': {
      'available': 300,
      'locked': 500
    },
    '01': {
      'available': 400,
      'locked': 1050
    }
  }

  expect(balance).toEqual(expect.objectContaining(expectedBalance));
});

test('Voided transaction: output not found aywhere', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A'
  let voidedElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
    'index': 0,
    'timestamp': 1549023313,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': true,
    'is_output': true,
  }

  let unspentTxs = {};
  let spentTxs = {};
  let voidedUnspentTxs = {};
  let voidedSpentTxs = {};
  wallet.onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedVoidedUnspent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
      'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
      'value': 200,
      'timelock': null,
      'timestamp': 1549023313,
    }
  }

  expect(isObjectEmpty(unspentTxs)).toBeTruthy();
  expect(isObjectEmpty(spentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedSpentTxs)).toBeTruthy();
  expect(voidedUnspentTxs).toEqual(expect.objectContaining(expectedVoidedUnspent));
});

test('Voided transaction: output found in unspentTxs', () => {
  let unspentTxs = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
      },
    },
    '11': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f,1': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 300,
        'timelock': null,
        'timestamp': 1549023315,
      }
    }
  }

  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A'
  let voidedElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
    'index': 0,
    'timestamp': 1549023313,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': true,
    'is_output': true,
  }

  let spentTxs = {};
  let voidedUnspentTxs = {};
  let voidedSpentTxs = {};
  wallet.onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedUnspent = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
      },
    },
    '11': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f,1': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 300,
        'timelock': null,
        'timestamp': 1549023315,
      }
    }
  }

  let expectedVoidedUnspent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
      'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
      'value': 200,
      'timelock': null,
      'timestamp': 1549023313,
    }
  }

  expect(unspentTxs).toEqual(expect.objectContaining(expectedUnspent));
  expect(isObjectEmpty(spentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedSpentTxs)).toBeTruthy();
  expect(voidedUnspentTxs).toEqual(expect.objectContaining(expectedVoidedUnspent));
});

test('Voided transaction: output found in spentTxs', () => {
  let spentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f',
      }
    ],
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295a',
      }
    ]
  }

  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A'
  let voidedElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
    'index': 0,
    'timestamp': 1549023313,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': true,
    'is_output': true,
  }

  let unspentTxs = {};
  let voidedUnspentTxs = {};
  let voidedSpentTxs = {};
  wallet.onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295a',
      }
    ]
  }

  let expectedVoidedUnspent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
      'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
      'value': 200,
      'timelock': null,
      'timestamp': 1549023313,
    }
  }

  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(unspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedSpentTxs)).toBeTruthy();
  expect(voidedUnspentTxs).toEqual(expect.objectContaining(expectedVoidedUnspent));
});

test('Voided transaction: input found in unspentTxs', () => {
  let unspentTxs = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
      },
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
      },
    },
    '11': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f,1': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 300,
        'timelock': null,
        'timestamp': 1549023315,
      }
    }
  }

  let expectedUnspent = JSON.parse(JSON.stringify(unspentTxs));

  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A'
  let voidedElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
    'index': 0,
    'timestamp': 1549023313,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': true,
    'is_output': false,
    'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
  }

  let spentTxs = {};
  let voidedUnspentTxs = {};
  let voidedSpentTxs = {};
  wallet.onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedVoidedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
      }
    ]
  }

  expect(unspentTxs).toEqual(expect.objectContaining(expectedUnspent));
  expect(isObjectEmpty(spentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(voidedSpentTxs).toEqual(expect.objectContaining(expectedVoidedSpent));
});

test('Voided transaction: input found in spentTxs (still have more in the array)', () => {
  let spentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f',
      },
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
      }
    ],
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295a',
      }
    ]
  }

  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A'
  let voidedElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023313,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': true,
    'is_output': false,
    'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
  }

  let unspentTxs = {};
  let voidedUnspentTxs = {};
  let voidedSpentTxs = {};
  wallet.onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f',
      }
    ],
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295a',
      }
    ]
  }

  let expectedVoidedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023313,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
      }
    ]
  }

  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(unspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(voidedSpentTxs).toEqual(expect.objectContaining(expectedVoidedSpent));
});

test('Voided transaction: input found in spentTxs (last one of array)', () => {
  let spentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
      }
    ],
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295a',
      }
    ]
  }

  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A'
  let voidedElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': true,
    'is_output': false,
    'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
  }

  let unspentTxs = {};
  let voidedUnspentTxs = {};
  let voidedSpentTxs = {};
  wallet.onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 400,
        'timelock': null,
        'timestamp': 1549023314,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295a',
      }
    ]
  }

  let expectedVoidedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
      }
    ]
  }

  let expectedUnspent = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
      }
    }
  }

  expect(unspentTxs).toEqual(expect.objectContaining(expectedUnspent));
  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(voidedSpentTxs).toEqual(expect.objectContaining(expectedVoidedSpent));
});

test('Winner transaction: output not found anywhere', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A';
  let winnerElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': false,
    'is_output': true,
  }

  let unspentTxs = {};
  let spentTxs = {};
  let voidedUnspentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b,0': {
      'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
      'value': 200,
      'timelock': null,
      'timestamp': 1549023315,
    }
  };
  let voidedSpentTxs = {};
  wallet.onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedUnspent = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
      }
    }
  }

  expect(unspentTxs).toEqual(expect.objectContaining(expectedUnspent));
  expect(isObjectEmpty(spentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedSpentTxs)).toBeTruthy();
});

test('Winner transaction: output found in unspentTxs', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A';
  let winnerElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': false,
    'is_output': true,
  }

  let unspentTxs = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
      }
    }
  }
  let expectedUnspent = JSON.parse(JSON.stringify(unspentTxs));

  let spentTxs = {};
  let voidedUnspentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b,0': {
      'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
      'value': 200,
      'timelock': null,
      'timestamp': 1549023315,
    }
  };
  let voidedSpentTxs = {};
  wallet.onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  expect(unspentTxs).toEqual(expect.objectContaining(expectedUnspent));
  expect(isObjectEmpty(spentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedSpentTxs)).toBeTruthy();
});

test('Winner transaction: output found in spentTxs', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A';
  let winnerElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': false,
    'is_output': true,
  }

  let spentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d'
      }
    ]
  }
  let expectedSpent = JSON.parse(JSON.stringify(spentTxs));

  let unspentTxs = {};
  let voidedUnspentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b,0': {
      'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
      'value': 200,
      'timelock': null,
      'timestamp': 1549023315,
    }
  };
  let voidedSpentTxs = {};
  wallet.onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(unspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedSpentTxs)).toBeTruthy();
});

test('Winner transaction: input found in unspentTxs', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A';
  let winnerElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': false,
    'is_output': false,
    'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
  }

  let unspentTxs = {
    '00': {
      '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315
      }
    }
  }

  let spentTxs = {};
  let voidedSpentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b'
      }
    ]
  };

  // Deep copy
  let expectedSpent = JSON.parse(JSON.stringify(voidedSpentTxs))
  let voidedUnspentTxs = {};
  wallet.onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedVoidedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': []
  }

  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(unspentTxs['00'])).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(voidedSpentTxs).toEqual(expect.objectContaining(expectedVoidedSpent));
});

test('Winner transaction: input not found anywhere', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A';
  let winnerElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': false,
    'is_output': false,
    'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
  }

  let unspentTxs = {}
  let spentTxs = {};
  let voidedSpentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b'
      }
    ]
  };

  // Deep copy
  let expectedSpent = JSON.parse(JSON.stringify(voidedSpentTxs))
  let voidedUnspentTxs = {};
  wallet.onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedVoidedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': []
  }

  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(unspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(voidedSpentTxs).toEqual(expect.objectContaining(expectedVoidedSpent));
});

test('Winner transaction: input found in spent', () => {
  let address = '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A';
  let winnerElement = {
    'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b',
    'index': 0,
    'timestamp': 1549023315,
    'value': 200,
    'token_uid': '00',
    'timelock': null,
    'voided': false,
    'is_output': false,
    'from_tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
  }

  let unspentTxs = {}
  let spentTxs = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': [
      {
        'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
        'value': 200,
        'timelock': null,
        'timestamp': 1549023315,
        'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295b'
      }
    ]
  };

  // Deep copy
  let voidedSpentTxs = JSON.parse(JSON.stringify(spentTxs))
  let expectedSpent = JSON.parse(JSON.stringify(spentTxs))
  let voidedUnspentTxs = {};
  wallet.onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs);

  let expectedVoidedSpent = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d,0': []
  }

  expect(spentTxs).toEqual(expect.objectContaining(expectedSpent));
  expect(isObjectEmpty(unspentTxs)).toBeTruthy();
  expect(isObjectEmpty(voidedUnspentTxs)).toBeTruthy();
  expect(voidedSpentTxs).toEqual(expect.objectContaining(expectedVoidedSpent));
});
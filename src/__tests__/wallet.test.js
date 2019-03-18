import wallet from '../utils/wallet';
import dateFormatter from '../utils/date';

test('Get wallet balance', () => {
  let historyTransactions = {
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e': {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295e',
      'inputs': [],
      'outputs': [
        {
          'decoded': {
            'address': '1PtH3rBmiYDiUuomQyoxMREicrxjg3LA5q',
            'timelock': null
          },
          'value': 100,
          'spent_by': null,
          'token': '00',
        },
        {
          'decoded': {
            'address': '1PtH3rBmiYDiUuomQyoxMREicrxjg3LA5q',
            'timelock': null
          },
          'value': 300,
          'spent_by': null,
          'token': '01',
        }
      ]
    },
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f': {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295f',
      'inputs': [],
      'outputs': [
        {
          'decoded': {
            'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
            'timelock': dateFormatter.dateToTimestamp(new Date()) - 99999,
          },
          'spent_by': null,
          'value': 200,
          'token': '00',
        },
        {
          'decoded': {
            'address': '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r',
            'timelock': dateFormatter.dateToTimestamp(new Date()) - 99999,
          },
          'value': 100,
          'spent_by': null,
          'token': '01',
        },
      ]
    },
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d': {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295d',
      'inputs': [],
      'outputs': [
        {
          'decoded': {
            'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
            'timelock': dateFormatter.dateToTimestamp(new Date()) + 99999,
          },
          'value': 500,
          'spent_by': null,
          'token': '00',
        },
        {
          'decoded': {
            'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
            'timelock': dateFormatter.dateToTimestamp(new Date()) + 99999,
          },
          'value': 1000,
          'token': '01',
          'spent_by': null,
        },
      ]
    },
    '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295c': {
      'tx_id': '00034a15973117852c45520af9e4296c68adb9d39dc99a0342e23cd6686b295c',
      'inputs': [],
      'outputs': [
        {
          'decoded': {
            'address': '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A',
            'timelock': dateFormatter.dateToTimestamp(new Date()) + 99999,
          },
          'value': 50,
          'token': '01',
          'spent_by': null,
        },
      ]
    }
  }

  const keys = {
    '13NREDS4kVKTvkDxcXS5JACRnD8DBHJb3A': {},
    '1PtH3rBmiYDiUuomQyoxMREicrxjg3LA5q': {},
    '171hK8MaRpG2SqQMMQ34EdTharUmP1Qk4r': {},
  }

  localStorage.setItem('wallet:data', JSON.stringify({'keys': keys}));

  const expectedBalance = {
    '00': {
      'available': 300,
      'locked': 500
    },
    '01': {
      'available': 400,
      'locked': 1050
    }
  }
  const filteredHistoryTransactions1 = wallet.filterHistoryTransactions(historyTransactions, '00');
  const balance1 = wallet.calculateBalance(filteredHistoryTransactions1, '00');
  expect(balance1).toEqual(expect.objectContaining(expectedBalance['00']));

  const filteredHistoryTransactions2 = wallet.filterHistoryTransactions(historyTransactions, '01');
  const balance2 = wallet.calculateBalance(filteredHistoryTransactions2, '01');
  expect(balance2).toEqual(expect.objectContaining(expectedBalance['01']));
});
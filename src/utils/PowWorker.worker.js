/* eslint import/no-webpack-loader-syntax: off */

import transaction2 from './transaction2';
import { MAX_NONCE } from '../constants';
import dateFormatter from './date';
import buffer from 'buffer';
import _ from 'lodash';
import { util } from 'bitcore-lib';

self.addEventListener("message", e => {
  let txData = e.data;
  console.log('Message received from main script');
  console.log(txData);
  let powPart1 = transaction2.getPowPart1(txData);
  let lastTime = txData.timestamp;
  let found = false;
  txData.nonce = 0;
  const target = transaction2.getTarget(txData);
  console.log('Target', target)
  while (txData.nonce < MAX_NONCE) {
    const now = dateFormatter.now();
    if ((now - lastTime) > 2) {
      console.log('Updating nonce', txData.nonce);
      txData.timestamp = now;
      powPart1 = transaction2.getPowPart1(txData);
      console.log('Pow part 1 ', util.buffer.bufferToHex(_.cloneDeep(powPart1).digest()));
      console.log('Pow part 1 de novo', util.buffer.bufferToHex(transaction2.getPowPart1(txData).digest()));
      lastTime = now;
      txData.nonce = 0;
    }

    const result = transaction2.getPowPart2(_.cloneDeep(powPart1), txData.nonce);
    if (parseInt(util.buffer.bufferToHex(result), 16) < target) {
      console.log('Result', parseInt(util.buffer.bufferToHex(result), 16))
      console.log('Result2 ', util.buffer.bufferToHex(result))
      self.postMessage({hash: result, nonce: txData.nonce, timestamp: txData.timestamp});
      found = true;
      break;
    }
    txData.nonce += 1;
  }
  if (!found) {
    self.postMessage(null);
  }
});
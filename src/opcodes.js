import { util } from 'bitcore-lib';

export const OP_GREATERTHAN_TIMESTAMP = util.buffer.hexToBuffer('6f');
export const OP_DUP = util.buffer.hexToBuffer('76');
export const OP_HASH160 = util.buffer.hexToBuffer('a9');
export const OP_EQUALVERIFY = util.buffer.hexToBuffer('88');
export const OP_CHECKSIG = util.buffer.hexToBuffer('ac');
export const OP_PUSHDATA1 = util.buffer.hexToBuffer('4c');

import wallet from '../utils/wallet';

test('Private key encryption/decryption', () => {
  let pin = '123456';

  wallet.executeGenerateWallet(256, '', pin, false);

  expect(wallet.isPinCorrect(pin)).toBeTruthy();
  expect(wallet.isPinCorrect('123')).toBeFalsy();

  let accessData = JSON.parse(localStorage.getItem('wallet:accessData'));
  let decrypted = wallet.decryptKey(accessData.mainKey, pin);

  let encryptedData = wallet.encryptData(decrypted, pin);
  let decrypted2 = wallet.decryptKey(encryptedData.encrypted.toString(), pin);

  expect(accessData.hash).toBe(encryptedData.pinHash.toString())
  expect(decrypted).toBe(decrypted2)
});
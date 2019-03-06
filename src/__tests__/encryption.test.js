import wallet from '../utils/wallet';

test('Private key encryption/decryption', () => {
  const pin = '123456';
  const password = 'password';

  const words = wallet.generateWalletWords(256);
  wallet.executeGenerateWallet(words, '', pin, password, false);

  expect(wallet.isPinCorrect(pin)).toBeTruthy();
  expect(wallet.isPinCorrect('123')).toBeFalsy();

  expect(wallet.isPasswordCorrect(password)).toBeTruthy();
  expect(wallet.isPasswordCorrect(pin)).toBeFalsy();

  let accessData = JSON.parse(localStorage.getItem('wallet:accessData'));
  let decrypted = wallet.decryptData(accessData.mainKey, pin);
  let decryptedWords = wallet.decryptData(accessData.words, password);

  let encryptedData = wallet.encryptData(decrypted, pin);
  let decrypted2 = wallet.decryptData(encryptedData.encrypted.toString(), pin);

  let encryptedWordsData = wallet.encryptData(decryptedWords, password);
  let decryptedWords2 = wallet.decryptData(encryptedWordsData.encrypted.toString(), password);

  expect(accessData.hash).toBe(encryptedData.hash.toString())
  expect(decrypted).toBe(decrypted2)

  expect(accessData.hashPasswd).toBe(encryptedWordsData.hash.toString())
  expect(decryptedWords).toBe(decryptedWords2)
});
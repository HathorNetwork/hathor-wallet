class LocalStorageStore {
  getItem(key) {
    let item;
    try {
      item = localStorage.getItem(key);
      return JSON.parse(item);
    } catch (e) {
      // old versions of the wallet would save strings without converting
      // to JSON, so we catch this exception here and return the string directly
      // FIXME this is a temporary solution and should be fixed by versioning
      // the storage: https://github.com/HathorNetwork/hathor-wallet-lib/issues/19
      if (e instanceof SyntaxError) {
        // first save in JSON format
        this.setItem(key, item);
        // return it
        return item;
      }
      throw e;
    }
  }

  setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key) {
    localStorage.removeItem(key);
  }

  clear() {
    localStorage.clear();
  }
}

export default LocalStorageStore;

import EventEmitter from 'events';
import { WS_URL } from './constants';
import wallet from './utils/wallet';
import { isOnlineUpdate } from "./actions/index";
import store from './store/index';

const HEARTBEAT_TMO = 30000;     // 30s


class WS extends EventEmitter {
  constructor(){
    if (!WS.instance) {
      super();
      this.connected = false;
      this.setup();
    }

    return WS.instance;
  }

  setup = () => {
    if (this.connected) {
      return;
    }
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = this.onOpen;
    this.ws.onmessage = this.onMessage;
    this.ws.onerror = this.onError;
    this.ws.onclose = this.onClose;
  }

  onMessage = evt => {
    const message = JSON.parse(evt.data)
    const _type = message.type.split(':')[0]
    this.emit(_type, message)
  }

  onOpen = () => {
    this.connected = true;
    // Save in redux
    store.dispatch(isOnlineUpdate({isOnline: true}));
    this.heartbeat = setInterval(this.sendPing, HEARTBEAT_TMO);
    wallet.subscribeAllAddresses();
  }

  onClose = () => {
    this.connected = false;
    // Save in redux
    store.dispatch(isOnlineUpdate({isOnline: false}));
    setTimeout(this.setup, 500);
    clearInterval(this.heartbeat);
  }

  onError = evt => {
    console.log('ws error', evt);
  }

  sendMessage = (msg) => {
    if (!this.connected) {
      // Save in redux
      store.dispatch(isOnlineUpdate({isOnline: false}));
      return;
    }
    
    this.ws.send(msg);
  }

  sendPing = () => {
    const msg = JSON.stringify({'type': 'ping'})
    this.sendMessage(msg)
  }

  endConnection = () => {
    // Save in redux
    store.dispatch(isOnlineUpdate({isOnline: undefined}));
    this.connected = false;
    this.ws.onclose = () => {};
    this.ws.close();
  }
}

const instance = new WS();

export default instance;

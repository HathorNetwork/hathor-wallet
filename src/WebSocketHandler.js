import EventEmitter from 'events';
import helpers from './utils/helpers';
import wallet from './utils/wallet';
import { isOnlineUpdate } from "./actions/index";
import store from './store/index';

const HEARTBEAT_TMO = 30000;     // 30s
const WS_READYSTATE_READY = 1;


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
    let wsURL = helpers.getWSServerURL();
    if (wsURL === null) {
      return;
    }
    this.ws = new WebSocket(wsURL);

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
    this.setIsOnline(true);
    this.heartbeat = setInterval(this.sendPing, HEARTBEAT_TMO);
    wallet.subscribeAllAddresses();
  }

  onClose = () => {
    this.connected = false;
    this.setIsOnline(false);
    setTimeout(this.setup, 500);
    clearInterval(this.heartbeat);
  }

  onError = evt => {
    console.log('ws error', evt);
  }

  sendMessage = (msg) => {
    if (!this.connected) {
      this.setIsOnline(false);
      return;
    }

    if (this.ws.readyState === WS_READYSTATE_READY) {
      this.ws.send(msg);
    } else {
      // If it is still connecting, we wait a little and try again
      setTimeout(() => {
        this.sendMessage(msg);
      }, 1000);
    }
  }

  sendPing = () => {
    const msg = JSON.stringify({'type': 'ping'})
    this.sendMessage(msg)
  }

  endConnection = () => {
    this.setIsOnline(undefined);
    this.connected = false;
    if (this.ws) {
      this.ws.onclose = () => {};
      this.ws.close();
    }
  }

  setIsOnline = (value) => {
    // Save in redux
    store.dispatch(isOnlineUpdate({isOnline: value}));
  }
}

const instance = new WS();

export default instance;

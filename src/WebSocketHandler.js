/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import EventEmitter from 'events';
import wallet from './utils/wallet';
import { isOnlineUpdate } from "./actions/index";
import store from './store/index';
import hathorLib from 'hathor-wallet-utils';

const HEARTBEAT_TMO = 30000;     // 30s
const WS_READYSTATE_READY = 1;


/**
 * Handles websocket connections and message transmission
 *
 * @class
 * @name WebSocketHandler
 */
class WS extends EventEmitter {
  constructor(){
    if (!WS.instance) {
      super();
      // Boolean to show when there is a websocket started with the server
      this.started = false;
      // Boolean to show when the websocket connection is working
      this.connected = undefined;
      // Store variable that is passed to Redux if ws is online
      this.isOnline = undefined;
      this.setup();
    }

    return WS.instance;
  }

  /**
   * Start websocket object and its methods
   */
  setup = () => {
    if (this.started) {
      return;
    }
    let wsURL = hathorLib.helpers.getWSServerURL();
    if (wsURL === null) {
      return;
    }
    this.ws = new WebSocket(wsURL);

    this.ws.onopen = this.onOpen;
    this.ws.onmessage = this.onMessage;
    this.ws.onerror = this.onError;
    this.ws.onclose = this.onClose;
  }

  /**
   * Handle message receiving from websocket
   *
   * @param {Object} evt Event that has data (evt.data) sent in the websocket
   */
  onMessage = evt => {
    const message = JSON.parse(evt.data)
    const _type = message.type.split(':')[0]
    this.emit(_type, message)
  }

  /**
   * Method called when websocket connection is opened
   */
  onOpen = () => {
    if (this.connected === false) {
      // If was not connected  we need to reload data
      wallet.reloadData();
    }
    this.connected = true;
    this.started = true;
    this.setIsOnline(true);
    this.heartbeat = setInterval(this.sendPing, HEARTBEAT_TMO);
    hathorLib.wallet.subscribeAllAddresses();
  }

  /**
   * Method called when websocket connection is closed
   */
  onClose = () => {
    this.started = false;
    this.connected = false;
    this.setIsOnline(false);
    setTimeout(this.setup, 500);
    clearInterval(this.heartbeat);
  }

  /**
   * Method called when an error happend on websocket
   *
   * @param {Object} evt Event that contains the error
   */
  onError = evt => {
    console.log('ws error', evt);
  }

  /**
   * Method called to send a message to the server
   *
   * @param {string} msg Message to be sent to the server (usually JSON stringified)
   */
  sendMessage = (msg) => {
    if (!this.started) {
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

  /**
   * Ping method to check if server is still alive
   *
   */
  sendPing = () => {
    const msg = JSON.stringify({'type': 'ping'})
    this.sendMessage(msg)
  }

  /**
   * Method called to end a websocket connection
   *
   */
  endConnection = () => {
    this.setIsOnline(undefined);
    this.started = false;
    this.connected = undefined;
    if (this.ws) {
      this.ws.onclose = () => {};
      this.ws.close();
    }
  }

  /**
   * Set in redux if websocket is online
   *
   * @param {*} value Can be true|false|undefined
   */
  setIsOnline = (value) => {
    // Save in redux
    // Need also to keep the value in 'this' because I was accessing redux store
    // from inside a reducer and was getting error
    if (this.isOnline !== value) {
      store.dispatch(isOnlineUpdate({isOnline: value}));
      this.isOnline = value;
    }
  }
}

const instance = new WS();

export default instance;

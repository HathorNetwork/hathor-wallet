// Mocking localStorage for tests
import 'jest-localstorage-mock';

// Mocking WebSocket for tests
import { Server, WebSocket } from 'mock-socket';
import helpers from './utils/helpers';
global.WebSocket = WebSocket;

localStorage.setItem('wallet:server', 'http://localhost:8080/');
let wsURL = helpers.getWSServerURL();

// Creating a ws mock server
const mockServer = new Server(wsURL);
mockServer.on('connection', socket => {
  socket.on('message', data => {
    let jsonData = JSON.parse(data);
    if (jsonData.type === 'subscribe_address') {
      // Only for testing purposes
      socket.send(JSON.stringify({'type': 'subscribe_success', 'address': jsonData.address}));
    }
  });
});

// When using asyncronous test jest expect does not raise fail
// so we need to call done.fail() ourselves when some test is wrong
global.check = (realValue, expectedValue, doneCb) => {
  if (expectedValue !== realValue) {
    doneCb.fail(`${expectedValue} != ${realValue}`);
  }
}

global.checkNot = (realValue, notExpectedValue, doneCb) => {
  if (notExpectedValue === realValue) {
    doneCb.fail(`${notExpectedValue} != ${realValue}`);
  }
}

global.isObjectEmpty = (obj) => {
  return Object.entries(obj).length === 0 && obj.constructor === Object
}

// Mocking axios
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
global.mock = new MockAdapter(axios);

// Default mock for /thin_wallet/address_history
mock.onGet('thin_wallet/address_history').reply((config) => {
  return [200, {'history': []}];
});
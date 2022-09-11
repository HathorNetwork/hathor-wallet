import { get } from 'lodash';

/**
 * Helper method to be used on take saga effect, will wait until an action
 * with type and payload matching the passed (type, payload)
 *
 * @param type - String with the action type
 * @param payload - Object with the keys and values to compare
 */
export const specificTypeAndPayload = (type, payload) => (action) => {
  if (type !== action.type) {
    return false;
  }

  const keys = Object.keys(payload);

  for (const key of keys) {
    if (get(action, key) !== get(payload, key)) {
      return false;
    }
  }

  return true;
};

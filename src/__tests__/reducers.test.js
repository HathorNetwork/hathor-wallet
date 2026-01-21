
import reducer, { onNanoContractDetailLoaded } from '../reducers/index';
import { NANO_CONTRACT_DETAIL_STATUS } from '../constants';

describe('reducers', () => {
  describe('onNanoContractDetailLoaded', () => {
    it('should update state correctly when passed an action object', () => {
      const initialState = {
        nanoContractDetailState: {
          state: null,
          status: NANO_CONTRACT_DETAIL_STATUS.LOADING,
          error: 'some error',
        }
      };
      const payload = {
        state: { some: 'data' }
      };
      const action = {
        type: 'some_type',
        payload
      };

      // This mimics how it's called in the rootReducer switch case:
      // case types.NANOCONTRACT_LOAD_DETAILS_SUCCESS:
      //   return onNanoContractDetailLoaded(state, action);
      
      const newState = onNanoContractDetailLoaded(initialState, action);

      expect(newState.nanoContractDetailState.state).toEqual(payload.state);
      expect(newState.nanoContractDetailState.status).toEqual(NANO_CONTRACT_DETAIL_STATUS.SUCCESS);
      expect(newState.nanoContractDetailState.error).toBeNull();
    });
  });
});

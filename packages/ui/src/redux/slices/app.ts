import { defaultNetwork } from '@dedot/signer-base';
import { createSlice, Draft, PayloadAction } from '@reduxjs/toolkit';

export interface AppState {
  ready: boolean;
  seedReady: boolean;
  locked: boolean;
  lastUsedAt: number | null;
  addressPrefix: number;
}

const initialState: AppState = {
  ready: false,
  seedReady: false,
  locked: true,
  lastUsedAt: null,
  addressPrefix: defaultNetwork.prefix,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    appReady: (state: Draft<AppState>) => {
      state.ready = true;
    },
    seedReady: (state: Draft<AppState>, action: PayloadAction<boolean | undefined>) => {
      state.seedReady = action.payload ?? true;
    },
    lock: (state: Draft<AppState>) => {
      state.locked = true;
    },
    unlock: (state: Draft<AppState>) => {
      state.locked = false;
    },
    recordLastUsedAt: (state: Draft<AppState>) => {
      state.lastUsedAt = Date.now();
    },
    updateAddressPrefix: (state: Draft<AppState>, action: PayloadAction<number>) => {
      state.addressPrefix = action.payload;
    },
  },
});

export const appActions = appSlice.actions;
export default appSlice;

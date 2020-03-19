import {
    UPDATE_CONFIG,
    UPDATE_CONNECTION,
    UPDATE_SID
} from "~/store/actions/general";

const initialState = {
    config: {},
    sid: null,
    isConnected: false
};

export const generalReducer = (state = initialState, action) => {
    switch (action.type) {
        case UPDATE_CONFIG:
            return {
                ...state,
                config: action.config
            };
        case UPDATE_SID:
            return {
                ...state,
                sid: action.sid
            };
        case UPDATE_CONNECTION:
            return {
                ...state,
                isConnected: action.status
            };

        default: return state;
    }
};
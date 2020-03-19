import {SERVER_FETCHING, UPDATE_METADATA} from "~/store/actions/display";

const initialState = {
    metadata: null,
    fetching: false
};

export const displayReducer = (state = initialState, action) => {
    switch (action.type) {
        case UPDATE_METADATA:
            return {
                ...state,
                metadata: action.metadata
            };
        case SERVER_FETCHING:
            return {
                ...state,
                fetching: action.state
            };

        default: return state;
    }
};
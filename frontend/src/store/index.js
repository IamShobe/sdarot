import {createStore, combineReducers, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import {composeWithDevTools} from 'redux-devtools-extension';
import {generalReducer} from "~/store/reducers/general";
import {displayReducer} from "~/store/reducers/display";

export const mainReducer = combineReducers({
    general: generalReducer,
    display: displayReducer
});

export const store = createStore(mainReducer,
    composeWithDevTools(
        applyMiddleware(thunk),
    ),
);

export default store;
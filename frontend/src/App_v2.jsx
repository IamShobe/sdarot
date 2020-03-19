import {hot} from 'react-hot-loader/root';
import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo, useRef,
    useState
} from 'react';
import {BrowserRouter as Router, Switch, Route} from 'react-router-dom';
import styled from "styled-components";
import {Provider, useDispatch, useSelector} from 'react-redux';
import io from 'socket.io-client';
import {SocketContext} from "~/SocketProvider";
import {StylesProvider, ThemeProvider} from "@material-ui/styles";
import {createMuiTheme} from "@material-ui/core";
import {GlobalStyle} from "~/globalStyle";
import {store} from "~/store";
import {Main} from "~/Main";
import Library from "~/Lib";
import Cookies from "universal-cookie";
import {
    fetchConfig,
    updateConnection,
    updateSID
} from "~/store/actions/general";


const theme = createMuiTheme({
    typography: {
        fontFamily: [
            'Assistant',
            'OpenSansHebrew',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
    },
});

const useSID = () => {
    const cookies = useMemo(() => new Cookies(), []);
    const dispatch = useDispatch();
    const [sid, setSid] = useState(cookies.get('room_id'));
    const {socket} = useContext(SocketContext);
    const connected = useSelector(state => state.general.isConnected);
    console.log(socket)

    useEffect(() => {
        const callback = (data) => {
            let source = 'cookie';
            if (!sid) {
                cookies.set('room_id', data.sid);
                setSid(data.sid);
                source = 'new token';
            }

            console.log(`Using session ${sid} originated from ${source}`);
            socket.emit('join', {'room': sid});
        };
        socket && socket.on('set_sid', callback);
        socket && socket.emit('get_sid');
        return () => socket && socket.off('set_sid', callback);
    }, [socket, connected]);
    useEffect(() => {
        dispatch(updateSID(sid));
    }, [sid, dispatch]);
    return sid;
};

const RoutedApp = () => {
    const sid = useSID();
    return (
        <Router>
            <Switch>
                <Route path="/show" component={Main}/>
                <Route path="/" component={Library}/>
            </Switch>
        </Router>
    )
};

const App = () => {
    const dispatch = useDispatch();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        dispatch(fetchConfig());
    }, []);

    useEffect(() => {
        const s = io();
        const connectCallback = () => {
            console.log("connected!");
            dispatch(updateConnection(true))
        };
        const disconnectCallback = () => {
            console.log("disconnected!");
            dispatch(updateConnection(false))
        };
        s.on('connect', connectCallback);
        s.on('disconnect', disconnectCallback);
        setSocket(s);

        return () => {
            s.off('connect', connectCallback);
            s.off('disconnect', disconnectCallback);
            setSocket(null);
        }
    }, []);


    return (
        <SocketContext.Provider value={{socket: socket}}>
            <GlobalStyle/>
            <RoutedApp/>
        </SocketContext.Provider>
    );
};

const ProvidedApp = () => {
    return (
        <Provider store={store}>
            <StylesProvider injectFirst>
                <ThemeProvider theme={theme}>
                    <App/>
                </ThemeProvider>
            </StylesProvider>
        </Provider>
    )
}

export default hot(ProvidedApp);

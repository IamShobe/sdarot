import React, {Component} from "react";
import axios from "axios";
import io from 'socket.io-client';
import Cookies from 'universal-cookie';

import { createMuiTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';


import "./App.scss";

const theme = createMuiTheme({
    typography: {
        fontFamily: [
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

class App extends Component {
    constructor() {
        super();
        this.state = {
            width: window.innerWidth,
        };
        this.socket = io();
        this.cookies = new Cookies();
        this.bindSocket();
        this.handleWindowSizeChange = this.handleWindowSizeChange.bind(this);
        this.showSettings = this.showSettings.bind(this);

        this.textref = React.createRef();
    }
    bindSocket() {
        this.socket.on('connect', function () {
            console.log("connected!")
        });
        this.socket.on('event', function (data) {
            console.log(`event:`, data)
        });
        this.socket.on('message', function (data) {
            console.log(`message:`, data)
        });
        this.socket.on('disconnect', function () {
            console.log("disconnected!")
        });
        this.socket.on('set_sid', (data) => {
            console.log(data);
            let room_id = data.sid;
            const cookie_room = this.cookies.get('room_id');
            console.log(cookie_room);
            if (!cookie_room) {
                this.cookies.set('room_id', data.sid);
            } else {
                room_id = cookie_room;
            }

            this.sid = room_id;
            this.socket.emit("join", {"room": room_id});
        });
    }

    componentWillMount() {
        window.addEventListener('resize', this.handleWindowSizeChange);
    }

    // make sure to remove the listener
    // when the component is not mounted anymore
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowSizeChange);
    }

    handleWindowSizeChange() {
        this.setState({width: window.innerWidth});
        console.log(window.innerWidth);
    };


    showSettings(event) {
        event.preventDefault();

    }

    download = () => {
        const val = this.textref.current.value;
        axios.post(`/api/${this.sid}/download_url`, {
            url: val
        });
    };

    render() {
        const {width} = this.state;
        const isMobile = width <= 900;

        return (
            <ThemeProvider theme={theme}>
            <div id="main-content">
                <div className="content">
                    <div className="container">
                        <input ref={this.textref} placeholder="url"/>
                        <button onClick={this.download}>Submit</button>
                    </div>
                </div>
            </div>
            </ThemeProvider>
        );
    }
}

export default App;

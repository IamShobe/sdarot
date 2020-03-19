import {createGlobalStyle} from "styled-components";

export const GlobalStyle = createGlobalStyle`
    //@import url('https://fonts.googleapis.com/css?family=Assistant:200,300,400,600,700,800&display=swap&subset=hebrew');
    html, body, #root {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        display: flex;
        flex: 1;
        font-family: 'Assistant', sans-serif;
        overflow: hidden;
        background-color: #181818;
    }
    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none;
      /* Non-prefixed version, currently
                                       supported by Chrome and Opera */
    }

    ::-webkit-scrollbar {
      width: 2px;
      height: 6px;
      //background-color: #323232;
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb {
      background-color: #383838;
      border-radius: 3px;
    }

    ::-webkit-scrollbar-track {
      -webkit-box-shadow: inset 0 0 6px rgba(181, 181, 181, 0.3);
      background-color: #151515;
      border-radius: 3px;
    }
`;

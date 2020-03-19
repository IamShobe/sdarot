import axios from 'axios';
export const UPDATE_CONFIG = "UPDATE_CONFIG";
export const UPDATE_SID = "UPDATE_SID";
export const UPDATE_CONNECTION = "UPDATE_CONNECTION";


export const updateConfig = (config) => ({
    type: UPDATE_CONFIG,
    config
});

export const updateSID = (sid) => ({
   type: UPDATE_SID,
   sid
});

export const updateConnection = (status) => ({
    type: UPDATE_CONNECTION,
    status
});

export const fetchConfig = () => async (dispatch) => {
    const resp = await axios.get("/api/config");
    const config = resp.data.config;
    dispatch(updateConfig(config));
    window.updateConfig(config);
};

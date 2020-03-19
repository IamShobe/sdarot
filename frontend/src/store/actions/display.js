import axios from "axios";

export const UPDATE_METADATA = 'UPDATE_METADATA';
export const SERVER_FETCHING = 'SERVER_FETCHING';

export const updateMetadata = (metadata) => ({
    type: UPDATE_METADATA,
    metadata
});

export const serverFetching = (state) => ({
    type: SERVER_FETCHING,
    state
});

export const refreshMetadata = (url) => async (dispatch) => {
    dispatch(serverFetching(true));
    const resp = await axios.put(`/api/metadata?url=${url}`);
    dispatch(updateMetadata(resp.data));
    dispatch(serverFetching(false));
};

export const fetchMetadata = (url) => async (dispatch) => {
    try {
        const resp = await axios.get(`/api/metadata?url=${url}`);
        dispatch(updateMetadata(resp.data));
    } catch (e) {
        if (e.response.status === 404) {
            await dispatch(refreshMetadata(url));
            return;
        }
        dispatch(updateMetadata(null));
    }
};



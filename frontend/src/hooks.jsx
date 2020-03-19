import {useEffect, useState} from "react";
import axios from "axios";


export const useDetails = (shash) => {
    const [details, setDetails] = useState({
        Sname: "",
        episode: 0,
        season: 0,
        SID: 0
    });

    useEffect(() => {
        axios.get(`/api/details/${shash}`).then((data) => {
            console.log(data);
            setDetails({
                Sname: data.data.details.Sname[1] || "",
                season: data.data.details.season || 1,
                episode: data.data.details.episode || 0,
                SID: data.data.details.SID || 0,
            });
        });
    }, []);

    return [details, setDetails];
};
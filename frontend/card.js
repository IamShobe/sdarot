import React, {Component} from "react";
import classNames from "classnames";
import axios from "axios";

import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';

import "./card.scss";


URL = "https://static.sdarot.pro/series/3282.jpg";


const STAGES = ["fetching", "loading", "pending",
    "downloading", "download_complete"];


class ShowCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ...props,
            Sname: "",
            episode: 0,
            season: 0,
            SID: 0,
            main_bar: 0,
            secondary_bar: 0
        }
    }

    static getDerivedStateFromProps(props, state) {
        if (props.column !== state.column) {
            return {
                ...state,
                ...props
            }
        }
        return null;
    }

    componentDidMount() {
        axios.get(`/api/details/${this.state.shash}`).then((data) => {
            console.log(data);
            this.setState({
                ...this.state,
                Sname: data.data.name[1] || "",
                season: data.data.season || 1,
                episode: data.data.episode || 0,
                SID: data.data.SID || 0,
            });
        });
    }

    updateData(event) {
        switch (event.state) {
            case "fetching":
                this.setState({
                    ...this.state,
                    Sname: event.details.name[1],
                    season: event.details.season,
                    episode: event.details.episode,
                    state: event.state,
                    main_bar: Math.round(1 * 100 / STAGES.length),
                    secondary_bar: 100
                });
                break;
            case "loading":
                this.setState({
                    ...this.state,
                    state: event.state,
                    main_bar: Math.round(3 * 100 / STAGES.length),
                    secondary_bar: Math.round(event.details * 100 / 30)
                });
                break;
            case "pending":
                this.setState({
                    ...this.state,
                    state: event.state,
                    main_bar: Math.round(2 * 100 / STAGES.length),
                    secondary_bar: 0
                });
                break;
            case "downloading":
                this.setState({
                    ...this.state,
                    state: event.state,
                    main_bar: Math.round(4 * 100 / STAGES.length),
                    secondary_bar: Math.round(event.details.current * 100 / event.details.total)
                });
                break;
            case "download_complete":
                this.setState({
                    ...this.state,
                    state: event.state,
                    main_bar: Math.round(5 * 100 / STAGES.length),
                    secondary_bar: 100
                });
                break;

            default:
                this.setState({
                    ...this.state,
                    state: event.state,
                });
                break;
        }
    }

    render() {
        return (
            <div
                className={classNames("card", {incomplete: this.state.state !== "download_complete"})}>
                <div className="pic">
                    <img src={`https://static.sdarot.pro/series/${this.state.SID}.jpg`}/>
                    <div className="mask">
                        <div className="progress">
                            <div className="state">{this.state.state}</div>
                            <LinearProgress className="bar"
                                            variant="determinate"
                                            value={this.state.main_bar}/>
                            <LinearProgress className="bar" color="secondary"
                                            variant={this.state.state !== "pending" ? "determinate" : "indeterminate"}
                                            value={this.state.secondary_bar}/>
                        </div>
                    </div>
                </div>
                <div className="details">
                    <Typography variant="h5" style={{
                        textTransform: "capitalize"
                    }}>
                        {this.state.Sname ? this.state.Sname.replace(/-/g, " ") : "undefined"}
                    </Typography>
                    <Typography variant="caption" style={{
                        textTransform: "capitalize"
                    }}>
                        season {this.state.season} episode {this.state.episode}
                    </Typography>
                </div>
            </div>
        );
    }
}

export default ShowCard;

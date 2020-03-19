import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState
} from 'react';
import styled from "styled-components";
import {useSelector} from "react-redux";
import SVG from 'react-inlinesvg';


import Container from "~/Container";
import LinearProgress from "@material-ui/core/LinearProgress";
import downloadUrl from './download.svg';
import trashUrl from './trash.svg';
import playUrl from './play.svg';
import axios from "axios";
import {SocketContext} from "~/SocketProvider";
import {readableBytes} from "~/utils";


export const CARD_SIZE = 214;
export const CARD_HEIGHT = 317;

const CardWrapper = styled.div`
 position: relative;
  display: inline-flex;
  flex-direction: column;
  width: ${CARD_SIZE}px;  // the size of the picture
`;

const Name = styled.span`
  font-size: 1.2rem;  
  color: white;
`;

const EpisodeDetails = styled.span`
  font-size: 0.8rem;
  color: gray;
`;

const Mask = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  background: linear-gradient(0, rgba(0,0,0,1) 0%, rgba(0,212,255,0) 100%);
  display: flex;
   // opacity: ${({shown}) => shown ? 1 : 0};
  
  ${CardWrapper}:hover & {
    opacity: 1;
  }
`;

const Overlay = styled.div`

  position: absolute;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s cubic-bezier(.25, .8, .25, 1);
  background: linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,212,255,0) 100%);
  display: flex;
  opacity: ${({shown}) => shown ? 1 : 0};
  
  ${CardWrapper}:hover & {
    opacity: 1;
  }
`;

const Progress = styled.div`
    position: relative;
    align-self: center;
    width: 100%;
    z-index: 1;
    flex-direction: column;
    align-items: center;
    margin-bottom: 10px;
    display: ${({shown}) => shown ? 'flex' : 'none'};
    transition: opacity 0.3s cubic-bezier(.25, .8, .25, 1);
`;

const State = styled.div`
    color: white;
    text-transform: uppercase;
    text-align: center;
    //font-weight: bold;
`;

const Bar = styled(({incomplete, ...props}) => <LinearProgress {...props} />)`
    width: 90%;
    margin-top: 5px;
    opacity: ${({incomplete}) => incomplete ? 1 : 0};
    transition: opacity 0.3s cubic-bezier(.25, .8, .25, 1);
`;

const Options = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
  opacity: ${({shown}) => shown ? 1 : 0};
  transition: opacity 0.3s cubic-bezier(.25, .8, .25, 1);
  
  ${CardWrapper}:hover & {
    opacity: 1;
  }
`;


const IconWrapper = styled.div`
    border: 1px solid white;
    border-radius: 50%;
    padding: 20px;
    margin: auto;
    width: 40px;
    height: 40px;
    cursor: pointer;
    display: ${({shown}) => shown ? 'flex' : 'none'};
    
    &:hover {
      border: 1px solid gray;
    }
`;

const Icon = styled(SVG)`
  width: 100%;
  height: 100%;
  fill: white;
  
    ${IconWrapper}:hover &  {
      fill: gray;
    }
`;

const Panel = styled.div`
  position: absolute;
  padding: 10px;
  display: ${({shown}) => shown ? 'flex' : 'none'};
`;

const SmallIcon = styled(SVG)`
  width: 20px;
  height: 20px;
  fill: white;
  cursor: pointer;
  margin: 0 5px;
  &:hover {
    fill: gray;
  }
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  position: absolute;
  bottom: 0;
  padding: 10px;
`;


const STAGES = ["fetching", "loading", "pending",
    "downloading", "download_complete"];

const progressReducer = (state, action) => {
    switch (action.type) {
        case "loading":
            return {
                main_bar: Math.round(3 * 100 / STAGES.length),
                secondary_bar: Math.round(action.event.details * 100 / 30),
                variant: 'determinate'
            };
        case "pending":
            return {
                main_bar: Math.round(2 * 100 / STAGES.length),
                secondary_bar: 0,
                variant: 'indeterminate'
            };

        case "downloading":
            return {
                main_bar: Math.round(4 * 100 / STAGES.length),
                secondary_bar: Math.round(action.event.details.current * 100 / action.event.details.total),
                variant: 'determinate'
            };

        case "download_complete":
            return {
                main_bar: Math.round(5 * 100 / STAGES.length),
                secondary_bar: 100,
                variant: 'determinate'
            };

        default:
            return {
                ...state,
                variant: 'indeterminate'
            };
    }
};

const useEpisode = (season, episode) => {
    return useMemo(() => season.episodes?.[episode]);
};

export const Card = ({season, index, downloaded}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadHash, setDownloadHash] = useState(null);
    const [speed, setSpeed] = useState(0);
    const {socket} = useContext(SocketContext);
    const sid = useSelector(state => state.general.sid);

    const [state, setState] = useState('pending');
    const [loading, dispatchLoading] = useReducer(progressReducer, {
        main_bar: 0,
        secondary_bar: 0,
        variant: 'indeterminate'
    });
    const incomplete = useMemo(() => state !== "download_complete", [state]);

    const metadata = useSelector(state => state.display.metadata);
    const episode = useEpisode(season, index);
    const isDownloaded = useMemo(() => {
        return downloaded.includes(
            window.episodeName(metadata.names[1], parseInt(season.name), parseInt(episode.name))
        );
    });

    const update = useCallback((event) => {
        dispatchLoading({type: event.state, event});
        setState(event.state);
        if (event.state === "downloading") {
            setSpeed(event.details.speed);
        } else {
            setSpeed(0);
        }
        if (event.state === "download_complete") {
            setIsDownloading(false)
        }
    });

    useEffect(() => {
        axios.post(`/api/get_hash`, {
            url: encodeURI(episode.url)
        }).then(resp => {
            setDownloadHash(resp.data);
        })
    }, [episode]);

    useEffect(() => {
        if (!downloadHash) return;
        const callback = (data) => {
            if (data.hash === downloadHash) {
                update(data);
                setIsDownloading(true);
            }
        };
        socket && socket.on('event', callback);
        return () => socket && socket.off('event', callback);
    }, [downloadHash]);

    const downloadEpisode = useCallback(() => {
        axios.post(`/api/${sid}/download_url`, {
            url: encodeURI(episode.url)
        }).then((data) => {
            const hash = data.data.hash;
            setDownloadHash(hash);
            setIsDownloading(true);
        });
    });

    const deleteEpisode = useCallback(() => {
        window.deleteEpisode(metadata.names[1], metadata.SID, parseInt(season.name), parseInt(episode.name));
    });

    const playEpisode = () => {
        window.launchEpisode(metadata.names[1], metadata.SID, parseInt(season.name), parseInt(episode.name));
    };

    return (
        <CardWrapper>
            <Container>
                <img src={metadata.image} height={`${CARD_HEIGHT}px`}
                     width={`${CARD_SIZE}px`}/>
                <Mask
                    shown={isDownloading && incomplete || !isDownloading && !isDownloaded}>
                    <Progress shown={isDownloading && incomplete}>
                        {
                            loading.variant === 'determinate' ? (
                                <State>{state} - {loading.secondary_bar}%
                                    {
                                        speed > 0 && (
                                            <>
                                                <br/>
                                                {readableBytes(speed, "/s")}
                                            </>
                                        )
                                    }
                                </State>
                            ) : <State>{state}</State>
                        }
                        <Bar variant="determinate"
                             incomplete={incomplete}
                             value={loading.main_bar}/>
                        <Bar color="secondary"
                             incomplete={incomplete}
                             variant={loading.variant}
                             value={loading.secondary_bar}/>
                    </Progress>
                </Mask>
                <Overlay shown={isDownloading && incomplete || !isDownloading && !isDownloaded}/>
                <Options shown={!isDownloading && !isDownloaded}>
                    <IconWrapper shown={!isDownloading && isDownloaded}
                                 onClick={playEpisode}>
                        <Icon src={playUrl}/>
                    </IconWrapper>
                    <Panel shown={!isDownloading && isDownloaded}>
                        <SmallIcon src={downloadUrl}
                                   onClick={downloadEpisode}/>
                        <SmallIcon src={trashUrl}
                                   onClick={deleteEpisode}/>
                    </Panel>
                    <IconWrapper shown={!isDownloading && !isDownloaded}
                                 onClick={downloadEpisode}>
                        <Icon src={downloadUrl}/>
                    </IconWrapper>
                </Options>
            </Container>
            <Details>
                <Name>
                    {metadata.names[1].replace(/-/g, " ").toUpperCase()}
                </Name>
                <EpisodeDetails>
                    Season {season.name} Episode {episode.name}
                </EpisodeDetails>
            </Details>
        </CardWrapper>
    )
};

export default Card;

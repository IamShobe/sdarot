import React, {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";
import {useDispatch, useSelector} from "react-redux";
import {SocketContext} from "~/SocketProvider";
import styled from "styled-components";
import Card, {CARD_SIZE} from "~/Card_v2";
import axios from "axios";
import {fetchMetadata, refreshMetadata} from "~/store/actions/display";
import Container from "~/Container";
import SVG from 'react-inlinesvg';
import {Link} from "react-router-dom";
import backUrl from './arrow.svg';
import refreshUrl from './refresh.svg';
import CircularProgress from "@material-ui/core/CircularProgress";


const useCards = () => {
    const [cards, setCards] = useState([]);
    const {socket} = useContext(SocketContext);

    useEffect(() => {
        const callback = (data) => {
            console.log(data);
            if (data.hash && !cards.includes(data.hash)) setCards([...cards, data.hash]);
        };
        socket && socket.on('event', callback);
        return () => socket && socket.off('event', callback);
    }, [socket]);
    return [cards, setCards];
};


const useSeason = () => {
    const [currentSeason, setCurrentSeasonNumber] = useState(0);
    const season = useSelector(state => state.display.metadata?.seasons?.[currentSeason]);
    return [season, setCurrentSeasonNumber, currentSeason];
};

const useDownloadedData = (metadata) => {
    const [downloadedEpisodes, setDownloadedEpisodes] = useState([]);

    useEffect(() => {
        let timer = null;
        if (metadata) {
            timer = window.watchEpisodesOf(metadata.names[1], metadata.SID, setDownloadedEpisodes);
        }
        return () => {
            window.disableEpisodesWatch(timer);
        }
    }, [metadata]);
    return downloadedEpisodes;
};


const Seasons = styled.div`
  overflow-x: auto;
  display: flex;
`;

const Season = styled.div`
  min-width: 0;
  flex-shrink: 0;
  width: 100px;
  border-radius: 5px;
  height: 30px;
  border: 1px solid white;
  display: inline-flex;
  margin: 5px;
  cursor: pointer;
  background-color: ${({selected}) => selected ? 'white' : 'transparent'};
  
  &:hover {
    background-color: gray;
  }
`;
const SeasonText = styled.span`
  margin: auto;
  color: ${({selected}) => selected ? 'black' : 'white'};
  
  ${Season}:hover &{
    color: black;
  }
`;

const Cards = styled.div`
  display: grid;
  padding: 10px;
  grid-template-columns: repeat(auto-fill, ${CARD_SIZE}px); 
  justify-content: space-around;
  overflow: auto;
  grid-gap: 10px;
`;

const Icon = styled(SVG)`
  width: 40px;
  height: 40px;
  fill: white;
  
  &:hover {
    fill: gray;
    cursor: pointer;
  }
`;

const Header = styled(Container)`
  align-items: center;
  padding: 10px;
`;

const HeaderShow = styled(Container)`
  flex: 1;
  margin: 0 10px;
`;

const ShowName = styled.div`
  color: white;
  flex: 1;
  display: flex;
`;

const ShowImage = styled.img`
  height: 60px;  
  margin-left: 10px;
`;

const Url = styled.input`
  flex: 1;
  margin-left: 10px;
`;

const Progress = styled(CircularProgress)`
  margin: auto;
`;

export const Main = ({location, history}) => {
    const [loading, setLoading] = useState(true);
    const fetching = useSelector(state => state.display.fetching);
    // const [url, setUrl] = useState();
    const urlRef = useRef(null);
    const [cards, setCards] = useCards();
    const sid = useSelector(state => state.general.sid);
    const dispatch = useDispatch();
    const metadata = useSelector(state => state.display.metadata);
    const [season, setCurrentSeasonNumber, seasonNumber] = useSeason();
    const metadataTimer = useRef();
    const downloadedEpisodes = useDownloadedData(metadata);


    const download = useCallback(() => {
        axios.post(`/api/${sid}/download_url`, {
            url: url
        }).then((data) => {
            const hash = data.data.hash;
            if (!cards.includes(hash)) {
                setCards([...cards, hash]);
            }
        });
    });


    const downloadEpisodeChain = useCallback((url, episode) => {
        axios.post(`/api/${sid}/download_url`, {
            url: `${url}/episode/${episode}`
        }).then((data) => {
            const hash = data.data.hash;
            if (!cards.includes(hash)) {
                setCards([...cards, hash]);
            }
            setTimeout(() => {
                downloadEpisodeChain(url, episode + 1)
            }, 3000);
        });
    });

    const downloadSeason = useCallback(() => {
        downloadEpisodeChain(url, 1);
    });


    const fetchUrl = useCallback(() => {
        const url = urlRef.current.value;
        (async () => {
            setLoading(true);
            await dispatch(fetchMetadata(url));
            setCurrentSeasonNumber(0);
            history.push(`/show?q=${url}`);
            setLoading(false);
        })();
    });

    useEffect(() => {
        urlRef.current.value = new URLSearchParams(window.location.search).get('q');
        fetchUrl();
    }, []);

    // useEffect(() => {
    //     clearTimeout(metadataTimer.current);
    //     metadataTimer.current = setTimeout(fetchUrl, 1000);
    //     setLoading(true);
    //     return () => clearTimeout(metadataTimer.current);
    // }, [url, dispatch]);

    const updateUrl = useCallback((e) => {
        clearTimeout(metadataTimer.current);
        metadataTimer.current = setTimeout(() => {
            fetchUrl();
        }, 1000);
    });

    const refreshPage = useCallback(() => {
        const url = urlRef.current.value;
        (async () => {
            await dispatch(refreshMetadata(url));
        })();
    });


    return (
        <Container column stretched>
            <Container column stretched>
                <Container column stretched>
                    <Header row>
                        <Link to={"/"}>
                            <Icon src={backUrl}/>
                        </Link>
                        <ShowImage src={metadata?.image}/>
                        <HeaderShow>
                            <ShowName>
                                {metadata?.names[1].replace(/-/g, " ").toUpperCase()}
                                <Url onChange={updateUrl}
                                     ref={urlRef}
                                     placeholder="url"/>
                            </ShowName>
                            <Seasons>
                                <Container row>
                                    {
                                        metadata?.seasons.map((season, index) => {
                                            return (
                                                <Season key={season.name}
                                                        selected={index === seasonNumber}
                                                        onClick={() => setCurrentSeasonNumber(index)}>
                                                    <SeasonText
                                                        selected={index === seasonNumber}>
                                                        Season {season.name}
                                                    </SeasonText>
                                                </Season>
                                            )
                                        })
                                    }
                                </Container>
                            </Seasons>
                        </HeaderShow>
                        {
                            loading || fetching ? <Progress/> : (
                                <Icon src={refreshUrl} onClick={refreshPage}/>
                            )
                        }
                    </Header>
                    <Cards key={`${metadata?.names[1]}_${seasonNumber}`}>
                        {
                            season?.episodes.map((episode, index) =>
                                <Card key={index}
                                      season={season} index={index}
                                      downloaded={downloadedEpisodes}
                                />)
                        }
                    </Cards>
                </Container>
            </Container>
        </Container>
    );
};

export default Main;

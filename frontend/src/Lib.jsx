import React, {useEffect, useMemo, useState} from 'react';
import Container from "~/Container";
import styled from "styled-components";
import {CARD_HEIGHT, CARD_SIZE} from "~/Card_v2";
import {Link} from "react-router-dom";
import SVG from "react-inlinesvg";
import wwwUrl from './www.svg';

const Name = styled.span`
  font-size: 1.2rem;  
  color: white;
`;

const CardWrapper = styled.div`
  display: inline-flex;
  flex-direction: column;
  width: ${CARD_SIZE}px;  // the size of the picture
`;
const Cards = styled.div`
  display: grid;
  padding: 10px;
  grid-template-columns: repeat(auto-fill, ${CARD_SIZE}px); 
  justify-content: space-around;
  overflow: auto;
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
const Header = styled.div`
  display: flex;
  padding: 10px;
`;
const Show = ({data}) => {

    return (
        <CardWrapper>
            <Link to={`/show?q=${data.metadata.url}`}
                  style={{textDecoration: 'none'}}>
                <img src={data.metadata.image} height={`${CARD_HEIGHT}px`} width={`${CARD_SIZE}px`}/>
            </Link>
            <Name>
                {data.metadata.names[1].replace(/-/g, " ").toUpperCase()}
            </Name>
        </CardWrapper>
    )
};

export const Library = ({location}) => {
    const [lib, setLib] = useState([]);

    useEffect(() => {
        const callback = (library) => {
            const pattern = /(.+?)_(.*)/;
            // library.forEach(l => {
            //     const match = pattern.exec(l);
            //     if (match) {
            //         window.deleteIfEmpty(match[1], match[2])
            //     }
            // });
            setLib(library.map(l => {
                const match = pattern.exec(l);
                if (match) {
                    return {
                        name: match[1],
                        SID: match[2],
                        metadata: window.readMetadataOf(match[1], match[2])
                    }
                }
            }))
        };
        window.registerLibChanges(callback);
        return () => window.unregisterLibChanges(callback);
    }, []);

    return (
        <Container stretched>
            <Header>
            <Link to={"/show"}>
                <Icon src={wwwUrl}/>
            </Link>
            </Header>
            <Cards>
                {lib.map((l, index) => <Show key={index} data={l}/>)}
            </Cards>
        </Container>
    );

};

export default Library;

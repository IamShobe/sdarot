import styled from "styled-components";

export const Container = styled.div`
  position: relative;
  overflow-y: ${({scrollable}) => scrollable ? 'auto' : 'visible'};
  display: ${(props) => (props.block ? 'block' : 'flex')};
  flex: ${(props) => (props.flex || (props.stretched ? '1 1 0' : '0 0 auto'))};
  flex-direction: ${(props) => (props.row ? 'row' : 'column')};
  background-color: ${(props) => props.background || 'transparent'};
  min-width: 0;
  min-height: 0;
`;

export default Container;

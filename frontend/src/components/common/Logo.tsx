import React from 'react';
import styled from 'styled-components';

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 25px 0;
  background-color: #121212;
`;

const LogoImage = styled.img`
  width: 120px;
  height: auto;
`;

const Logo: React.FC = () => {
  return (
    <LogoContainer>
      <LogoImage src="/logo.svg" alt="NEDOMA" />
    </LogoContainer>
  );
};

export default Logo;

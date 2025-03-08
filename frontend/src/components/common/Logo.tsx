import React from 'react';
import styled from 'styled-components';

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  padding: 25px 0;
  background-color: #F9F7FE;
  box-shadow: none;
`;

const LogoImage = styled.img`
  width: 138px; /* 120px * 1.15 = 138px (15% larger) */
  height: auto;
`;

const Logo: React.FC = () => {
  return (
    <LogoContainer>
      <LogoImage src="/logo-black.svg" alt="NEDOMA" />
    </LogoContainer>
  );
};

export default Logo;

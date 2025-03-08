import React from 'react';
import styled from 'styled-components';

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg} 0;
`;

const LogoImage = styled.img`
  width: 138px;
  height: auto;
`;

const AdminLogo: React.FC = () => {
  return (
    <LogoContainer>
      <LogoImage src="/logo-black.svg" alt="NEDOMA" />
    </LogoContainer>
  );
};

export default AdminLogo;

import styled from 'styled-components';

export const Title = styled.h2`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

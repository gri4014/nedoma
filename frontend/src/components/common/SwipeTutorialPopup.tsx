import React from 'react';
import styled from 'styled-components';

interface SwipeTutorialPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const Overlay = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.isVisible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PopupContainer = styled.div`
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  width: 85%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
`;

const ConfirmButton = styled.button`
  background: #2840CF;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 24px;
  width: 100%;
  transition: all 0.2s ease;
  
  &:hover {
    background: #2235B1;
  }
`;

const Title = styled.h3`
  font-size: 18px;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
`;

const SwipeItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const IconContainer = styled.div`
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
`;

const SwipeText = styled.p`
  font-size: 16px;
  color: #333;
  margin: 0;
  flex: 1;
`;

// SVG components for the arrows
const ArrowRight = () => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.4961 14.8145" width="24" height="24">
    <g>
      <path d="M18.1348 7.40234C18.1348 7.1582 18.0371 6.93359 17.8418 6.74805L11.3672 0.292969C11.1523 0.078125 10.9473 0 10.7129 0C10.2344 0 9.86328 0.351562 9.86328 0.839844C9.86328 1.07422 9.94141 1.29883 10.0977 1.45508L12.2852 3.68164L16.1621 7.2168L16.3574 6.72852L13.2129 6.5332L0.859375 6.5332C0.351562 6.5332 0 6.89453 0 7.40234C0 7.91016 0.351562 8.27148 0.859375 8.27148L13.2129 8.27148L16.3574 8.07617L16.1621 7.59766L12.2852 11.123L10.0977 13.3496C9.94141 13.4961 9.86328 13.7305 9.86328 13.9648C9.86328 14.4531 10.2344 14.8047 10.7129 14.8047C10.9473 14.8047 11.1523 14.7168 11.3477 14.5312L17.8418 8.05664C18.0371 7.87109 18.1348 7.64648 18.1348 7.40234Z" fill="#2840CF"/>
    </g>
  </svg>
);

const ArrowUp = () => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15.166 18.4473" width="24" height="24">
    <g>
      <path d="M7.40234 18.4473C7.91016 18.4473 8.27148 18.0957 8.27148 17.5879L8.27148 4.72656L8.17383 1.81641L7.61719 2.01172L11.123 5.84961L13.3496 8.03711C13.5059 8.19336 13.7305 8.27148 13.9648 8.27148C14.4531 8.27148 14.8047 7.90039 14.8047 7.42188C14.8047 7.1875 14.7266 6.98242 14.541 6.78711L8.05664 0.292969C7.87109 0.0976562 7.64648 0 7.40234 0C7.1582 0 6.93359 0.0976562 6.74805 0.292969L0.273438 6.78711C0.0878906 6.98242 0 7.1875 0 7.42188C0 7.90039 0.351562 8.27148 0.839844 8.27148C1.07422 8.27148 1.30859 8.19336 1.45508 8.03711L3.68164 5.84961L7.17773 2.01172L6.63086 1.81641L6.5332 4.72656L6.5332 17.5879C6.5332 18.0957 6.89453 18.4473 7.40234 18.4473Z" fill="#2840CF"/>
    </g>
  </svg>
);

const ArrowLeft = () => (
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18.4961 14.8145" width="24" height="24">
    <g>
      <path d="M0 7.40234C0 7.64648 0.107422 7.87109 0.302734 8.05664L6.78711 14.5312C6.98242 14.7168 7.1875 14.8047 7.42188 14.8047C7.90039 14.8047 8.28125 14.4531 8.28125 13.9648C8.28125 13.7305 8.19336 13.4961 8.03711 13.3496L5.84961 11.123L1.98242 7.59766L1.77734 8.07617L4.92188 8.27148L17.2754 8.27148C17.7832 8.27148 18.1348 7.91016 18.1348 7.40234C18.1348 6.89453 17.7832 6.5332 17.2754 6.5332L4.92188 6.5332L1.77734 6.72852L1.98242 7.2168L5.84961 3.68164L8.03711 1.45508C8.19336 1.29883 8.28125 1.07422 8.28125 0.839844C8.28125 0.351562 7.90039 0 7.42188 0C7.1875 0 6.98242 0.078125 6.76758 0.292969L0.302734 6.74805C0.107422 6.93359 0 7.1582 0 7.40234Z" fill="#2840CF"/>
    </g>
  </svg>
);

const SwipeTutorialPopup: React.FC<SwipeTutorialPopupProps> = ({ isOpen, onClose }) => {
  return (
    <Overlay isVisible={isOpen} onClick={onClose}>
      <PopupContainer onClick={(e) => e.stopPropagation()}>
        <Title>Как пользоваться свайпами</Title>
        
        <SwipeItem>
          <IconContainer>
            <ArrowRight />
          </IconContainer>
          <SwipeText>Свайпни вправо, если тебе интересно мероприятие</SwipeText>
        </SwipeItem>
        
        <SwipeItem>
          <IconContainer>
            <ArrowUp />
          </IconContainer>
          <SwipeText>Свайпни вверх, если хочешь пойти на мероприятие</SwipeText>
        </SwipeItem>
        
        <SwipeItem>
          <IconContainer>
            <ArrowLeft />
          </IconContainer>
          <SwipeText>Свайпни влево, если тебе не интересно</SwipeText>
        </SwipeItem>
        
        <ConfirmButton onClick={onClose}>
          Хорошо
        </ConfirmButton>
      </PopupContainer>
    </Overlay>
  );
};

export default SwipeTutorialPopup;

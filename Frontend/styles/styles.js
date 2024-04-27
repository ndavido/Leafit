import React, {useState} from 'react';
import styled, {css} from "styled-components/native";
import {FontAwesome5} from "@expo/vector-icons";
import {TouchableOpacity} from "react-native";

/* Main Styling */
export const Main = styled.View`
  flex: 1;
  overflow: hidden;
  background-color: #6BFF91;
`;

export const Wrapper = styled.View`
  height: 100%;
  width: 100%;
  top: 80px;
  margin: auto;
`;

export const WrapperScroll = styled.ScrollView`
  height: 100%;
  width: 100%;
  top: 80px;
  margin: auto;
`;

export const Content = styled.View`
  flex: 1 1 auto;
  position: relative;
  min-width: 1px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
`;

export const Container = styled.View`
  height: auto;
  width: 100%;
  padding: 20px;
  margin: 0 auto;
  position: relative;
`;

export const ButtonDiv = styled.View`
  height: auto;
  width: 100%;
  margin-bottom: 150px;
  bottom: 0;
  padding: 20px;
  position: absolute;
`;

export const TitleContainer = styled.View`
  position: relative;
  height: 130px;
  width: 100%;
`;

export const InputTxt = styled.TextInput`
  margin-bottom: 10px;
  padding: 10px;
  height: auto;
  line-height: 18px;
  background-color: ${props => props.bcolor || '#F7F7F7'};
  border-radius: 10px;
  ${(props) => props.inputErrorBorder && redBorderColor}
  ${(props) => props.inputErrorBorder1 && redBorderColor}
`;

export const TextBox = styled.View`
  line-height: 18px;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 10px;
  background-color: ${props => props.bcolor || '#F7F7F7'};
` ;

export const TextDisplay = styled.Text`
  height: auto;
  line-height: 18px;
`;

export const TextContainer = ({ children, bcolor }) => (
    <TextBox bcolor={bcolor}>
        <TextDisplay>{children}</TextDisplay>
    </TextBox>
);

export const ButtonContainer = styled.View`
  margin-bottom: 30px;
  margin-top: 15px;
  justify-content: space-between;
  flex-direction: row;
  height: 40px;
  width: 100%
`;

export const TextWrapper = styled.View`
  margin: 10px;
  height: auto;
`;


/* Welcome Screen */
export const WelcomeMain = styled.View`
  flex: 1;
  overflow: hidden;
  background-color: white;
  align-items: center;
  justify-content: center;
`;

const LogoContainer = styled.View`
  height: 20%;
  width: 100%;
  margin-top: 225px;
  margin-bottom: 40px;
  z-index: 1000;
  position: relative;
`;

const LogoImg = styled.Image`
  flex: 1;
  resizeMode: contain;
  width: 100%;
`;

export const WelcomeImg = () => (
    <LogoContainer>
        <LogoImg source={require('../assets/appAssets/welcome.png')}/>
    </LogoContainer>
);


/* Login & Register Screen */
export const LRContainer = styled.View`
  height: auto;
  padding: 5px;
  border-radius: 10px;
  width: ${props => props.width || 'calc(100% - 20px)'};
  flex-direction: row;
  background-color: #F7F7F7;
  margin-bottom: 10px;
  margin-top: ${props => props.mTop || 160}px;
  margin-left: ${props => props.mLeft || 10}px;
  margin-right: ${props => props.mRight || 10}px;
  position: relative;
`;

const redBorderColor = css`
  border-color: red;
  border-width: 1px;
`;

export const PhoneTxt = styled.TextInput`
  width: 82%;
  margin-left: 2%;
  margin-bottom: 10px;
  padding: 10px;
  height: auto;
  line-height: 18px;
  background-color: #F7F7F7;
  border-radius: 10px;
  ${(props) => props.errorBorder && redBorderColor}
`;

export const CCTxt = styled.TextInput`
  width: 16%;
  margin-bottom: 10px;
  padding: 10px;
  text-align: center;
  height: auto;
  line-height: 18px;
  background-color: #F7F7F7;
  border-radius: 10px;
`;

export const LRButtonDiv = styled.View`
  height: auto;
  width: 100%;
  margin-top: 520px;
  padding: 20px;
  position: absolute;
`;

export const LRButtonDivAlt = styled.View`
  height: auto;
  width: 100%;
  margin-top: 20px;
  margin-bottom: 100px;
  padding: 20px;
  position: relative;
`;


/* Dashboard Screen */
export const DashboardContainer = styled.View`
  background-color: #F7F7F7;
  position: relative;
  display: inline-block;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding-bottom: 100px;
`;

export const CardOverlap = styled.View`
  margin-top: -50px;
  display: flex;
`;

export const CardContainer = styled.View`
  display: flex;
  flex-direction: row;
`;

export const Card = styled.View`
  background-color: ${props => props.bColor || "#ffffff"};
  flex: 1;
  border-radius: 8px;
  padding: 10px;
  margin: 10px;
`;

export const CardMini = styled.View`
  background-color: ${props => props.bColor || "#F7F7F7"};
  flex: 1;
  border-radius: 8px;
  padding: 10px;
  margin-top: 10px;
`;

export const CardTitle = styled.Text`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
`;

/* OCR Screen */
export const BottomBar = styled.View`
  position: absolute;
  margin-bottom: 80px;
  bottom: 0;
  left: 0;
  right: 0;
  flex-direction: row;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  height: 18%;
  background-color: #FFFFFF;
`;

export const ReceiptContainer= styled.View`
  position: relative;
  margin-top: 20px;
  margin-bottom: 80px;
  bottom: 0;
  left: 0;
  right: 0;
  flex-direction: row;
  border-radius: 10px;

  height: 62%;
  background-color: #FFFFFF;
`;

/* Account Screen */
export const TopInfo = styled.View`
  position: relative;
  height: 200px;
  top: 10px;
  width: 100%;
`;

export const TopDesign = styled.View`
  position: absolute;
  background-color: #F7F7F7;
  height: 130px;
  bottom: 0px;
  width: 100%;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  z-index: 0;
`;

export const AccountContainer = styled.View`
  background-color: #F7F7F7;
  position: relative;
  display: inline-block;
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 70px;
`;

export const DeveloperTick = styled.Text`
  font-size: 14px;
`;

/* Modals */
export const ModalContent = styled.View`
  background-color: white;
  padding: 20px;
  border-radius: 20px;
  margin: 50px;
  min-width: 350px;
  min-height: 200px;
  border: 1px solid #ddd;
`;

/* Search Bar */
const SearchContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #F7F7F7;
  border-radius: 10px;
  padding: 8px;
`;

const SearchInput = styled.TextInput`
  flex: 1;
  margin-left: 8px;
  font-size: 16px;
  color: #333;
`;

export const SearchBox = ({placeholder, onChangeText, value}) => {
    const [hasText, setHasText] = useState(false);

    const handleClear = () => {
        onChangeText('');
        setHasText(false);
    };

    return (
        <SearchContainer>
            <FontAwesome5 name="search" size={18} color="#b8bec2"/>
            <SearchInput
                placeholder={placeholder}
                placeholderTextColor="#888"
                onChangeText={text => {
                    onChangeText(text);
                    setHasText(text !== '');
                }}
                value={value}
            />
            { hasText && (
                <TouchableOpacity onPress={handleClear}>
                    <FontAwesome5 name="times" size={18} color="#b8bec2" style={{marginLeft: 8}}/>
                </TouchableOpacity>
            )}
        </SearchContainer>
    );
};
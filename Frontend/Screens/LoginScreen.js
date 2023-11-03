import React, { useState } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

//Styling
import { Main, ContainerWrapper, ContainerInner, ContainerContent, BttnDiv, TxtWrapper, WelcomeTxt, BttnDiv2, InputWrapper, InputTxt } from '../styles/wrapper';
import PressableButton from '../styles/buttons';
import PressableButton2 from '../styles/buttons2';
import Logo from '../styles/logo';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    phone_number: '',
  });

  const [message, setMessage] = useState('');

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async () => {
    try {
      const apiKey = process.env.REACT_NATIVE_API_KEY;

      // Add the API key to the request headers
      const config = {
        headers: {
          'X-API-Key': apiKey,
        },
      };

      console.log(config)

      const response = await axios.post('http://127.0.0.1:5000/login', formData, config);
      if (response && response.data) {
        setMessage(response.data.message);

        if (response.data.message === 'Login code sent successfully!') {
          navigation.navigate('LoginVerify'); // Navigate to code verification screen
        }
      } else {
        // Handle other cases or errors if needed
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'An error occurred.');
    }
  };

  return (
    <Main>
      <Logo/>
      <ContainerWrapper>
          <ContainerInner>
            <ContainerContent>
        <BttnDiv2>
          <PressableButton2
            onPress={() => navigation.navigate('Register')}
            title='Register'
            bgColor='#6bff91'
            txtColor='white'
          />
          <PressableButton2
            
            title='Login'
            bgColor='white'
            txtColor='black'
          />
        </BttnDiv2>
        <InputWrapper>
        <Text>Phone Number</Text>
        <InputTxt
          placeholder=""
          onChangeText={(text) => handleChange('phone_number', text)}
        />
        <Text>{message}</Text>
        </InputWrapper>
      <BttnDiv>
          <PressableButton
            onPress={handleLogin} 
            title='Send Login Code'
            bgColor='#6bff91'
          />
        </BttnDiv>
        </ContainerContent>
          </ContainerInner>
        </ContainerWrapper>
    </Main>
  );
};

export default LoginScreen;
/* eslint-disable react/react-in-jsx-scope */
import React, {createContext, useState, useContext, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileContext = createContext();

export const ProfileProvider = ({children}) => {
  const [profile, setProfile] = useState({
    appName: 'FinAI',
    caption: 'Financial research, faster.',
    wallpaper: 'Clean',
    language: 'English',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('appProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.log('Profile load error:', error);
    }
  };

  const updateProfile = async newProfile => {
    setProfile(newProfile);
    try {
      await AsyncStorage.setItem('appProfile', JSON.stringify(newProfile));
    } catch (error) {
      console.log('Profile save error:', error);
    }
  };

  return (
    <ProfileContext.Provider value={{profile, updateProfile}}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};

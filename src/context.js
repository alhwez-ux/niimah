import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useAppState must be used inside the app provider');
  }
  return value;
}

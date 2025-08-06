import { createContext, useContext, useState } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [plan, setPlan] = useState(null);

  return (
    <UserContext.Provider value={{ plan, setPlan }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

import React, { createContext, useContext } from 'react';

// Auth is no longer managed by Base44.
// Access control is handled entirely client-side:
//   - Family code (6-digit) identifies the family
//   - PIN (4-digit) unlocks the device session (24 hours)
//   - Active member is stored in localStorage via familyStore
// Supabase is accessed directly using the anon key + family_code filtering.

const AuthContext = createContext({
  isAuthenticated: true,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  appPublicSettings: null,
  user: null,
  logout: () => {},
  navigateToLogin: () => {},
  checkAppState: () => {},
});

export const AuthProvider = ({ children }) => {
  return (
    <AuthContext.Provider value={{
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      user: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

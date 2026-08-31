import React, { createContext, useContext, useState, useEffect } from 'react';
import { Farmer, Officer, UserRole } from '../types';

interface AuthContextType {
  user: Farmer | Officer | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  loginAsFarmer: (farmerData: Farmer, authToken: string) => void;
  loginAsOfficer: (officerData: Officer, authToken: string) => void;
  updateUser: (updatedData: Partial<Farmer | Officer>) => void;
  logout: () => void;
  quickDemoFarmerLogin: () => Promise<void>;
  quickDemoOfficerLogin: (officerId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Farmer | Officer | null>(() => {
    const saved = localStorage.getItem('km_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [role, setRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('km_role') as UserRole) || null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('km_token') || null;
  });

  const loginAsFarmer = (farmerData: Farmer, authToken: string) => {
    const farmer = { ...farmerData, role: 'farmer' as const };
    setUser(farmer);
    setRole('farmer');
    setToken(authToken);
    localStorage.setItem('km_user', JSON.stringify(farmer));
    localStorage.setItem('km_role', 'farmer');
    localStorage.setItem('km_token', authToken);
  };

  const loginAsOfficer = (officerData: Officer, authToken: string) => {
    const officer = { ...officerData, role: 'officer' as const };
    setUser(officer);
    setRole('officer');
    setToken(authToken);
    localStorage.setItem('km_user', JSON.stringify(officer));
    localStorage.setItem('km_role', 'officer');
    localStorage.setItem('km_token', authToken);
  };

  const updateUser = (updatedData: Partial<Farmer | Officer>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData } as Farmer | Officer;
      localStorage.setItem('km_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setToken(null);
    localStorage.removeItem('km_user');
    localStorage.removeItem('km_role');
    localStorage.removeItem('km_token');
  };

  const quickDemoFarmerLogin = async () => {
    try {
      const res = await fetch('/api/auth/farmer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: '9876543210',
          otp: '123456',
          name: 'Ravi Kumar',
          language: 'Tamil',
          village: 'Vengikkal Village',
          district: 'Tiruvannamalai',
          state: 'Tamil Nadu',
          latitude: 12.2253,
          longitude: 79.0747
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        loginAsFarmer(data.user, data.token);
      }
    } catch (e) {
      console.error('Demo login failed:', e);
    }
  };

  const quickDemoOfficerLogin = async (officerId: string = 'OFFICER-B') => {
    try {
      const res = await fetch('/api/auth/officer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerId,
          password: 'password123'
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        loginAsOfficer(data.user, data.token);
      }
    } catch (e) {
      console.error('Demo officer login failed:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated: !!user,
        loginAsFarmer,
        loginAsOfficer,
        updateUser,
        logout,
        quickDemoFarmerLogin,
        quickDemoOfficerLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

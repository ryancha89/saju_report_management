import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 초기 로드 시 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('manager_token');
    if (token) {
      checkAuth(token);
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setManager(data.manager);
        } else {
          localStorage.removeItem('manager_token');
        }
      } else {
        localStorage.removeItem('manager_token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('manager_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/manager/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('manager_token', data.token);
        setManager(data.manager);
        return { success: true };
      } else {
        setError(data.error || '로그인에 실패했습니다');
        return { success: false, error: data.error };
      }
    } catch (err) {
      const errorMsg = '서버 연결에 실패했습니다';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('manager_token');

    try {
      await fetch(`${API_BASE_URL}/api/v1/manager/logout`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      localStorage.removeItem('manager_token');
      setManager(null);
    }
  };

  const getToken = () => {
    return localStorage.getItem('manager_token');
  };

  const isAdmin = () => {
    return manager?.role === 'admin';
  };

  const value = {
    manager,
    loading,
    error,
    login,
    logout,
    getToken,
    isAdmin,
    isAuthenticated: !!manager,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

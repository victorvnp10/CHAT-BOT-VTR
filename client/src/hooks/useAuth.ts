import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, LoginData, InsertUser } from "@shared/schema";

// Token management
const TOKEN_KEY = 'fab_auth_token';
const USER_KEY = 'fab_user_data';

// Local storage helpers
const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
};

const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
};

const getStoredUser = (): User | null => {
  try {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

const setStoredUser = (user: User): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user data:', error);
  }
};

// Auth headers helper
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// API request helper
const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  return response;
};

export function useAuth() {
  const queryClient = useQueryClient();

  // Get current user query
  const { 
    data: user, 
    isLoading, 
    error: queryError,
    refetch: refetchUser 
  } = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const token = getToken();
        if (!token) {
          return null;
        }

        const storedUser = getStoredUser();
        if (storedUser) {
          // Verify token is still valid
          const response = await apiRequest('/auth/me');
          
          if (response.status === 401) {
            removeToken();
            return null;
          }
          
          if (!response.ok) {
            console.error('Failed to verify token');
            return storedUser; // Return cached user
          }

          const freshUser = await response.json();
          setStoredUser(freshUser);
          return freshUser;
        }

        const response = await apiRequest('/auth/me');
        
        if (response.status === 401) {
          removeToken();
          return null;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        setStoredUser(userData);
        return userData;
        
      } catch (error) {
        console.error('Auth check failed:', error);
        removeToken();
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (loginData: LoginData) => {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const result = await response.json();
      console.log('Login API response:', result);
      
      if (result.token && result.user) {
        setToken(result.token);
        setStoredUser(result.user);
        console.log('Token saved:', result.token.substring(0, 20) + '...');
        console.log('User saved:', result.user.name);
      } else {
        console.error('Invalid login response format:', result);
        throw new Error('Resposta de login inválida');
      }
      
      return result;
    },
    onSuccess: (data) => {
      console.log('Login mutation onSuccess:', data);
      const userData = data.user || data;
      queryClient.setQueryData(['auth', 'me'], userData);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      console.log('Auth state should be updated now');
    },
    onError: (error) => {
      console.error('Login error:', error);
      removeToken();
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
      
      const result = await response.json();
      
      if (result.token && result.user) {
        setToken(result.token);
        setStoredUser(result.user);
      }
      
      return result;
    },
    onSuccess: (data) => {
      const userData = data.user || data;
      queryClient.setQueryData(['auth', 'me'], userData);
      // Force immediate refetch to ensure auth state is updated
      refetchUser();
    },
    onError: (error) => {
      console.error('Registration error:', error);
      removeToken();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      removeToken();
      
      try {
        // Optional API call to logout endpoint
        await apiRequest('/auth/logout', {
          method: 'POST',
        });
      } catch (error) {
        // Ignore errors since we've already removed the token
        console.warn('Logout API call failed:', error);
      }
      
      return { message: 'Logout successful' };
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
    },
  });

  // Computed properties
  const isAuthenticated = !!user && !!getToken();
  const hasError = !!queryError || !!loginMutation.error || !!registerMutation.error;
  const currentError = queryError || loginMutation.error || registerMutation.error;

  return {
    // User data
    user,
    isAuthenticated,
    isLoading,
    
    // Actions
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refetchUser,
    
    // Loading states
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    
    // Errors
    hasError,
    error: currentError,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    
    // Utility
    getToken,
    clearAuth: () => {
      removeToken();
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.clear();
    },
  };
}
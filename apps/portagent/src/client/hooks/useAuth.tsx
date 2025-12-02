import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

/**
 * User information
 */
export interface UserInfo {
  userId: string;
  username: string;
  email: string;
  containerId: string;
  displayName?: string;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: UserInfo | null;
  login: (
    usernameOrEmail: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    username: string,
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "portagent_token";
const USER_KEY = "portagent_user";

/**
 * Auth API client
 */
async function loginApi(
  usernameOrEmail: string,
  password: string
): Promise<{ token: string; user: UserInfo } | { error: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Login failed" };
    }

    return { token: data.token, user: data.user };
  } catch {
    return { error: "Network error" };
  }
}

async function registerApi(
  username: string,
  email: string,
  password: string,
  displayName?: string
): Promise<{ token: string; user: UserInfo } | { error: string }> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, displayName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Registration failed" };
    }

    return { token: data.token, user: data.user };
  } catch {
    return { error: "Network error" };
  }
}

async function verifyApi(token: string): Promise<UserInfo | null> {
  try {
    const response = await fetch("/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Auth Provider
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUserJson = localStorage.getItem(USER_KEY);

    if (storedToken && storedUserJson) {
      try {
        // Verify token is still valid
        verifyApi(storedToken).then((verifiedUser) => {
          if (verifiedUser) {
            setToken(storedToken);
            setUser(verifiedUser); // Use verified user from server
          } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
          setIsLoading(false);
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (
      usernameOrEmail: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      const result = await loginApi(usernameOrEmail, password);

      if ("token" in result) {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
        return { success: true };
      }

      return { success: false, error: result.error };
    },
    []
  );

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      displayName?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const result = await registerApi(username, email, password, displayName);

      if ("token" in result) {
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
        return { success: true };
      }

      return { success: false, error: result.error };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        isLoading,
        token,
        user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Get auth token for API calls
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

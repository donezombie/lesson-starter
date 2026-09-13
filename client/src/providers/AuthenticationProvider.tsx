import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { PERMISSION_ENUM } from "@/consts/common";
import httpService from "@/services/httpService";
import { UserInfo } from "@/interfaces/user";
import { showError } from "@/helpers/toast";
import BaseUrl from "@/consts/baseUrl";

interface AuthenticationContextI {
  loading: boolean;
  isLogged: boolean;
  user: UserInfo | null;
  login: ({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isEmployee: boolean;
}

const AuthenticationContext = createContext<AuthenticationContextI>({
  loading: false,
  isLogged: false,
  user: null,
  login: () => Promise.resolve(),
  logout: () => {},
  isAdmin: false,
  isEmployee: false,
});

export const useAuth = () => useContext(AuthenticationContext);

const AuthenticationProvider = ({ children }: { children: any }) => {
  //! State
  const { t } = useTranslation("shared");
  const [token, setToken] = useState(httpService.getTokenStorage());
  const [user, setUser] = useState<UserInfo | null>(
    httpService.getUserStorage()
  );
  const [isLogging, setIsLogging] = useState(false);

  //! Function
  const login = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      try {
        setIsLogging(true);
        const loginResponse = await httpService.post("/login", {
          username,
          password,
        });
        const nextToken = loginResponse.data.token;

        // Persist the token before the next request: the http service's
        // interceptor reads it fresh from storage on every request, so it
        // must already be saved for `/api/me` to be sent authenticated.
        httpService.saveTokenStorage(nextToken);

        const meResponse = await httpService.get("/api/me");
        const nextUser = meResponse.data as UserInfo;

        setToken(nextToken);
        setUser(nextUser);
        httpService.saveUserStorage(nextUser);

        window.location.href = BaseUrl.Homepage;
      } catch (error) {
        // Clear any token saved before `/api/me` failed, so a stale/invalid
        // token doesn't linger in storage for a subsequent request.
        httpService.clearStorage();
        showError(t("login.loginFailed"));
      } finally {
        setIsLogging(false);
      }
    },
    [t]
  );

  const logout = useCallback(() => {
    httpService
      .post("/logout", {})
      .catch(() => {})
      .finally(() => {
        httpService.clearStorage();
        window.sessionStorage.clear();
        window.location.reload();
      });
  }, []);

  //! Return
  const value = useMemo(() => {
    return {
      loading: isLogging,
      isLogged: !!user && !!token,
      user,
      logout,
      login,
      isAdmin: user?.role === PERMISSION_ENUM.ADMIN,
      isEmployee: user?.role === PERMISSION_ENUM.EMPLOYEE,
    };
  }, [login, logout, user, token, isLogging]);

  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
};

export default AuthenticationProvider;

import { Suspense } from "react";
import {
  BrowserRouter as Router,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import Page404 from "@/pages/Page404";

import { ToastContainer } from "react-toastify";
import { ErrorBoundary } from "react-error-boundary";
import PrivateRoute from "@/components/PrivateRoute";
import AuthenticationProvider from "./providers/AuthenticationProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import i18n from "./i18n/config";
import Loading from "./components/ui/loading";
import SidebarProvider from "./providers/SidebarProvider";
import { showError } from "./helpers/toast";
import BaseUrl from "./consts/baseUrl";
import { PERMISSION_ENUM } from "./consts/common";
import withCheckRole from "./HOCs/withCheckRole";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import DefaultLayout from "./layouts/DefaultLayout";
import Homepage from "./pages/Homepage";
import ChangePassword from "./pages/ChangePassword";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import LeaveRequests from "./pages/LeaveRequests";

const AdminEmployees = withCheckRole(Employees, [PERMISSION_ENUM.ADMIN]);

const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        showError(error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      gcTime: 0,
      staleTime: 0,
    },
  },
});

const App = () => {
  //! Render
  const renderContent = () => {
    return (
      <Router>
        <Routes>
          <Route path={BaseUrl.Login} element={<Login />} />
          <Route path={BaseUrl.ForgotPassword} element={<ForgotPassword />} />
          <Route
            path={BaseUrl.Homepage}
            element={
              <Suspense
                fallback={
                  <div className="p-2">
                    <Loading />
                  </div>
                }
              >
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <PrivateRoute>
                    <DefaultLayout>
                      <Outlet />
                    </DefaultLayout>
                  </PrivateRoute>
                </ErrorBoundary>
              </Suspense>
            }
          >
            <Route index element={<Homepage />} />
            <Route path={BaseUrl.ChangePassword} element={<ChangePassword />} />
            <Route path={BaseUrl.Attendance} element={<Attendance />} />
            <Route path={BaseUrl.LeaveRequests} element={<LeaveRequests />} />
            <Route path={BaseUrl.Employees} element={<AdminEmployees />} />
          </Route>

          <Route path="*" element={<Page404 />} />
        </Routes>
      </Router>
    );
  };

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider defaultTheme="light" storageKey="theme">
        <QueryClientProvider client={queryClient}>
          <AuthenticationProvider>
            <SidebarProvider>
              {renderContent()}
              <ToastContainer />
            </SidebarProvider>
          </AuthenticationProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
};

export default App;

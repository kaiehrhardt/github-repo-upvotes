import './styles.css';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import { GitHubApiError } from './api/client';
import { App } from './App';
import { ContributionsPage } from './features/contributions/ContributionsPage';
import { RepoPage } from './features/repo/RepoPage';
import { clearStoredToken } from './hooks/useToken';
import { getToken } from './storage';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Drop a token GitHub rejected, so the user is asked for a new one
      if (error instanceof GitHubApiError && error.type === 'UNAUTHORIZED' && getToken()) {
        clearStoredToken();
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        error instanceof GitHubApiError && error.type === 'NETWORK' && failureCount < 2,
    },
  },
});

// Hash routing works on GitHub Pages without server-side rewrites
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/repo" replace /> },
      { path: 'repo', element: <RepoPage /> },
      { path: 'repo/:owner/:name', element: <RepoPage /> },
      { path: 'contributions', element: <ContributionsPage /> },
      { path: '*', element: <Navigate to="/repo" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);

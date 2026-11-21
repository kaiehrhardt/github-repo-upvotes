import { Outlet } from 'react-router';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ErrorBox, LoadingState } from './components/StatusViews';
import { TokenSettings } from './components/TokenSettings';
import { useOAuthCallback } from './hooks/useOAuthCallback';

export function App() {
  const oauth = useOAuthCallback();

  return (
    <div className="min-h-screen bg-github-canvas-subtle dark:bg-github-canvas-dark">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {oauth.pending && <LoadingState title="Completing GitHub sign-in..." />}
        {oauth.error && (
          <div className="mb-8">
            <ErrorBox title="Sign-in failed" message={oauth.error} />
          </div>
        )}
        <TokenSettings />
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

import { useState } from 'react';
import Config from './components/Config';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import GlobalApiKeys from './components/ApiKeys';
import UsageAnalytics from './components/Usage';

type Page = 'dashboard' | 'models' | 'api-keys' | 'usage' | 'edit';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const onConfigure = (appId: string) => {
    setSelectedAppId(appId);
    setCurrentPage('edit');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onConfigureApp={onConfigure} />;
      case 'edit':
        return <Config appId={selectedAppId} onBack={() => setCurrentPage('dashboard')} />;
      case 'api-keys':
        return <GlobalApiKeys />;
      case 'usage':
        return <UsageAnalytics />;
      default:
        return <Dashboard onConfigureApp={onConfigure} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
export default App;

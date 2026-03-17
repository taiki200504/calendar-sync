import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { Dashboard } from './pages/Dashboard';
import { FindSlots } from './pages/FindSlots';
import { ConflictDetail } from './pages/ConflictDetail';
import { RulesPage } from './pages/Rules';
import { SyncPage } from './pages/SyncPage';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { AuthSetup } from './components/AuthSetup';

function App() {
  return (
    <>
      <Routes>
        <Route path="/sign-in/*" element={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <SignIn routing="path" path="/sign-in" />
          </div>
        } />
        <Route path="/" element={
          <>
            <SignedOut>
              <Navigate to="/sign-in" replace />
            </SignedOut>
            <SignedIn>
              <AuthSetup>
                <Layout />
              </AuthSetup>
            </SignedIn>
          </>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="find-slots" element={<FindSlots />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="conflicts/:id" element={<ConflictDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;

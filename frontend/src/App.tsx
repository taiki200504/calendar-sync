import { Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { FindSlots } from './pages/FindSlots';
import { ConflictDetail } from './pages/ConflictDetail';
import { RulesPage } from './pages/Rules';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="find-slots" element={<FindSlots />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="conflicts/:id" element={<ConflictDetail />} />
      </Route>
    </Routes>
  );
}

export default App;

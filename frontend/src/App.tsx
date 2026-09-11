import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Returns from './pages/Returns';
import CreditManagement from './pages/CreditManagement';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import AIAssistant from './pages/AIAssistant';
import UsersPage from './pages/UsersPage';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout title={title}>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Page title="Dashboard"><Dashboard /></Page>} />
            <Route path="/pos" element={<Page title="Sales (POS)"><POS /></Page>} />
            <Route path="/inventory" element={<Page title="Inventory"><Inventory /></Page>} />
            <Route path="/customers" element={<Page title="Customers"><Customers /></Page>} />
            <Route path="/suppliers" element={<Page title="Suppliers"><Suppliers /></Page>} />
            <Route path="/purchases" element={<Page title="Purchases"><Purchases /></Page>} />
            <Route path="/returns" element={<Page title="Returns"><Returns /></Page>} />
            <Route path="/credit" element={<Page title="Credit Management"><CreditManagement /></Page>} />
            <Route path="/expenses" element={<Page title="Expenses"><Expenses /></Page>} />
            <Route path="/reports" element={<Page title="Reports"><Reports /></Page>} />
            <Route path="/assistant" element={<Page title="AI Business Assistant"><AIAssistant /></Page>} />
            <Route path="/users" element={<Page title="Users"><UsersPage /></Page>} />
            <Route path="/settings" element={<Page title="Settings"><Settings /></Page>} />
            <Route path="*" element={<Page title="Not Found"><NotFound /></Page>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

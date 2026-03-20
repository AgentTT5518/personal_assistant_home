import { Routes, Route } from 'react-router-dom';
import { Layout } from './layout';
import { DashboardPage } from './pages/dashboard';
import { DocumentsPage } from './pages/documents';
import { TransactionsPage } from './pages/transactions';
import { AnalysisPage } from './pages/analysis';
import { SettingsPage } from './pages/settings';
import { BudgetsPage } from './pages/budgets';
import { DocumentDetail } from '../features/document-upload/index.js';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/:id" element={<DocumentDetail />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
      </Route>
    </Routes>
  );
}

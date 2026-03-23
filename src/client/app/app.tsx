import { Routes, Route } from 'react-router-dom';
import { Layout } from './layout';
import { DashboardPage } from './pages/dashboard';
import { DocumentsPage } from './pages/documents';
import { TransactionsPage } from './pages/transactions';
import { AnalysisPage } from './pages/analysis';
import { SettingsPage } from './pages/settings';
import { BudgetsPage } from './pages/budgets';
import { AccountsPage } from './pages/accounts';
import { DocumentDetail } from '../features/document-upload/index.js';
import { ImportPage } from './pages/import';
import { BillsPage } from './pages/bills';
import { GoalsPage } from './pages/goals';
import { ReportsPage } from './pages/reports';

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
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ReportData } from '../../../../shared/types/index.js';
import { formatCurrency } from '../../../shared/utils/format-currency.js';
import { downloadReportPdf } from '../api.js';
import { log } from '../logger.js';

interface ReportViewerProps {
  reportId: string;
  title: string;
  periodFrom: string;
  periodTo: string;
  data: ReportData;
  currency: string;
}

export function ReportViewer({ reportId, title, periodFrom, periodTo, data, currency }: ReportViewerProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadReportPdf(reportId, title);
    } catch (error) {
      log.error('PDF download failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{periodFrom} to {periodTo}</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Income" value={formatCurrency(data.summary.income, currency)} color="text-green-600" />
        <SummaryCard label="Expenses" value={formatCurrency(data.summary.expenses, currency)} color="text-red-600" />
        <SummaryCard label="Net" value={formatCurrency(data.summary.net, currency)} color={data.summary.net >= 0 ? 'text-green-600' : 'text-red-600'} />
        <SummaryCard label="Transactions" value={String(data.summary.transactionCount)} color="text-gray-900" />
      </div>

      {/* Category Breakdown Pie Chart */}
      {data.categoryBreakdown.length > 0 && (
        <Section title="Spending by Category">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, payload }: { name?: string; payload?: { percentage?: number } }) => `${name ?? ''} (${payload?.percentage ?? 0}%)`}
                >
                  {data.categoryBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.categoryColor} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Monthly Comparison Bar Chart */}
      {data.monthlyComparison && data.monthlyComparison.length > 1 && (
        <Section title="Monthly Comparison">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Budget vs Actual Table */}
      {data.budgetVsActual.length > 0 && (
        <Section title="Budget vs Actual">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Category</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Budget</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Actual</th>
                  <th className="text-right py-2 pl-4 font-medium text-gray-600">% Used</th>
                </tr>
              </thead>
              <tbody>
                {data.budgetVsActual.map((b, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.categoryColor }} />
                      {b.categoryName}
                    </td>
                    <td className="text-right py-2 px-4">{formatCurrency(b.budgetAmount, currency)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(b.actualSpent, currency)}</td>
                    <td className={`text-right py-2 pl-4 font-medium ${b.percentUsed > 100 ? 'text-red-600' : b.percentUsed > 80 ? 'text-amber-600' : 'text-green-600'}`}>
                      {b.percentUsed}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Top Merchants Table */}
      {data.topMerchants.length > 0 && (
        <Section title="Top Merchants">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Merchant</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-right py-2 pl-4 font-medium text-gray-600">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {data.topMerchants.map((m, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{m.merchant}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(m.amount, currency)}</td>
                    <td className="text-right py-2 pl-4">{m.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Account Breakdown Table */}
      {data.accountBreakdown && data.accountBreakdown.length > 0 && (
        <Section title="Account Breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Account</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 hidden sm:table-cell">Type</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Income</th>
                  <th className="text-right py-2 px-4 font-medium text-gray-600">Expenses</th>
                  <th className="text-right py-2 pl-4 font-medium text-gray-600">Net</th>
                </tr>
              </thead>
              <tbody>
                {data.accountBreakdown.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4">{a.accountName}</td>
                    <td className="py-2 px-4 capitalize text-gray-500 hidden sm:table-cell">{a.type.replace('_', ' ')}</td>
                    <td className="text-right py-2 px-4 text-green-600">{formatCurrency(a.income, currency)}</td>
                    <td className="text-right py-2 px-4 text-red-600">{formatCurrency(a.expenses, currency)}</td>
                    <td className={`text-right py-2 pl-4 font-medium ${a.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(a.net, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

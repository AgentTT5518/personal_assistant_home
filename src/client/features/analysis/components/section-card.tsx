import ReactMarkdown from 'react-markdown';
import { TrendingUp, PieChart, BarChart3, AlertTriangle, Lightbulb } from 'lucide-react';
import type { AnalysisSection } from '../../../../shared/types/index.js';

const SECTION_ICONS: Record<AnalysisSection['type'], typeof TrendingUp> = {
  overview: BarChart3,
  categories: PieChart,
  trends: TrendingUp,
  anomalies: AlertTriangle,
  recommendations: Lightbulb,
};

const SECTION_COLORS: Record<AnalysisSection['type'], string> = {
  overview: 'text-blue-600',
  categories: 'text-purple-600',
  trends: 'text-green-600',
  anomalies: 'text-amber-600',
  recommendations: 'text-teal-600',
};

interface SectionCardProps {
  section: AnalysisSection;
}

export function SectionCard({ section }: SectionCardProps) {
  const Icon = SECTION_ICONS[section.type] ?? BarChart3;
  const iconColor = SECTION_COLORS[section.type] ?? 'text-gray-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
      </div>

      <div className="prose prose-sm max-w-none text-gray-700">
        <ReactMarkdown>{section.content}</ReactMarkdown>
      </div>

      {section.highlights && section.highlights.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Key Takeaways</p>
          <ul className="space-y-1">
            {section.highlights.map((highlight, i) => (
              <li key={`highlight-${i}`} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-0.5">&#8226;</span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

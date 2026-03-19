import { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import type { AiSettingResponse, AIProviderType } from '../../../../shared/types/index.js';
import { useAiSettings, useUpdateAiSetting } from '../hooks.js';

const PROVIDER_OPTIONS: { value: AIProviderType; label: string }[] = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openai_compat', label: 'OpenAI Compatible' },
];

const TASK_TYPE_LABELS: Record<string, string> = {
  pdf_extraction: 'PDF Text Extraction',
  pdf_vision_extraction: 'PDF Vision Extraction',
  categorisation: 'Transaction Categorisation',
  analysis_insights: 'Analysis & Insights',
  insurance_analysis: 'Insurance Analysis',
  health_analysis: 'Health Analysis',
};

function SettingCard({
  setting,
  onSave,
  isSaving,
}: {
  setting: AiSettingResponse;
  onSave: (data: { provider: string; model: string; fallbackProvider?: string | null; fallbackModel?: string | null }) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState(setting.provider);
  const [model, setModel] = useState(setting.model);
  const [fallbackProvider, setFallbackProvider] = useState(setting.fallbackProvider ?? '');
  const [fallbackModel, setFallbackModel] = useState(setting.fallbackModel ?? '');

  function handleSave() {
    onSave({
      provider,
      model,
      fallbackProvider: fallbackProvider || null,
      fallbackModel: fallbackModel || null,
    });
    setEditing(false);
  }

  function handleCancel() {
    setProvider(setting.provider);
    setModel(setting.model);
    setFallbackProvider(setting.fallbackProvider ?? '');
    setFallbackModel(setting.fallbackModel ?? '');
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          {TASK_TYPE_LABELS[setting.taskType] ?? setting.taskType}
        </h4>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProviderType)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fallback Provider</label>
            <select
              value={fallbackProvider}
              onChange={(e) => setFallbackProvider(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fallback Model</label>
            <input
              type="text"
              value={fallbackModel}
              onChange={(e) => setFallbackModel(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !model}
              className="inline-flex items-center gap-1 bg-blue-600 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={12} />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1 text-gray-600 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-gray-100"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="text-gray-400">Provider:</span>{' '}
            {PROVIDER_OPTIONS.find((p) => p.value === setting.provider)?.label ?? setting.provider}
          </p>
          <p>
            <span className="text-gray-400">Model:</span> {setting.model}
          </p>
          {setting.fallbackProvider && (
            <p>
              <span className="text-gray-400">Fallback:</span>{' '}
              {PROVIDER_OPTIONS.find((p) => p.value === setting.fallbackProvider)?.label ?? setting.fallbackProvider}{' '}
              / {setting.fallbackModel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function AiSettingsPanel() {
  const { data: settings, isLoading, error } = useAiSettings();
  const updateMutation = useUpdateAiSetting();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">
          Failed to load AI settings: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (!settings || settings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No AI settings configured. Run the database seed.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Provider Settings</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {settings.map((setting) => (
          <SettingCard
            key={setting.id}
            setting={setting}
            onSave={(data) => updateMutation.mutate({ taskType: setting.taskType, data })}
            isSaving={updateMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

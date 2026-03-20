import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useCurrency, useUpdateAppSetting } from '../hooks.js';

const COMMON_CURRENCIES = ['AUD', 'USD', 'GBP', 'EUR', 'JPY', 'CAD', 'NZD', 'SGD', 'HKD', 'CHF'];

export function CurrencySelector() {
  const currentCurrency = useCurrency();
  const updateSetting = useUpdateAppSetting();
  const [customValue, setCustomValue] = useState('');
  const isOther = !COMMON_CURRENCIES.includes(currentCurrency);

  function handleSelect(code: string) {
    if (code === currentCurrency) return;
    updateSetting.mutate({ key: 'currency', value: code });
  }

  function handleCustomSubmit() {
    const code = customValue.trim().toUpperCase();
    if (code.length >= 3) {
      updateSetting.mutate({ key: 'currency', value: code });
      setCustomValue('');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Currency</h3>
      <p className="text-sm text-gray-500 mb-4">
        Set the display currency for dashboard and analysis.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        {COMMON_CURRENCIES.map((code) => (
          <button
            key={code}
            onClick={() => handleSelect(code)}
            disabled={updateSetting.isPending}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              currentCurrency === code
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {code}
            {currentCurrency === code && <Check className="inline h-3.5 w-3.5 ml-1" />}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={isOther ? currentCurrency : customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Other (e.g. INR)"
          maxLength={5}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32"
        />
        <button
          onClick={handleCustomSubmit}
          disabled={updateSetting.isPending || customValue.trim().length < 3}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
        </button>
      </div>

      {updateSetting.isError && (
        <p className="mt-2 text-sm text-red-600">
          {updateSetting.error instanceof Error ? updateSetting.error.message : 'Failed to update currency'}
        </p>
      )}
    </div>
  );
}

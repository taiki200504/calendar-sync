import { useState } from 'react';
import { CalendarSettings } from './Rules/components/CalendarSettings';
import { ExclusionRules } from './Rules/components/ExclusionRules';

export function RulesPage() {
  const [activeTab, setActiveTab] = useState<'calendars' | 'exclusions'>('calendars');

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">同期ルール設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          カレンダーの同期設定と除外ルールを管理できます
        </p>
      </div>

      {/* タブ */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendars')}
            className={`${
              activeTab === 'calendars'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            カレンダー設定
          </button>
          <button
            onClick={() => setActiveTab('exclusions')}
            className={`${
              activeTab === 'exclusions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            除外ルール
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'calendars' && <CalendarSettings />}
        {activeTab === 'exclusions' && <ExclusionRules />}
      </div>
    </div>
  );
}

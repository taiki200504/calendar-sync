import { ConflictVariant } from '../types';

interface ConflictDiffProps {
  variantA: ConflictVariant;
  variantB: ConflictVariant;
}

export function ConflictDiff({ variantA, variantB }: ConflictDiffProps) {
  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isDifferent = (field: 'start' | 'end' | 'location' | 'description') => {
    const a = variantA.data[field] || '';
    const b = variantB.data[field] || '';
    return a !== b;
  };

  const FieldRow = ({
    label,
    field,
  }: {
    label: string;
    field: 'start' | 'end' | 'location' | 'description';
  }) => {
    const different = isDifferent(field);
    const valueA = variantA.data[field] || '';
    const valueB = variantB.data[field] || '';

    return (
      <div className={`grid grid-cols-2 gap-4 py-3 ${different ? 'bg-yellow-50' : ''}`}>
        <div className="px-4">
          <div className="text-xs font-medium text-gray-500 mb-1">{label} (A)</div>
          <div className={`text-sm ${different ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
            {field === 'start' || field === 'end' ? formatDateTime(valueA) : valueA || '(空欄)'}
          </div>
        </div>
        <div className="px-4 border-l border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-1">{label} (B)</div>
          <div className={`text-sm ${different ? 'text-blue-600 font-semibold' : 'text-gray-900'}`}>
            {field === 'start' || field === 'end' ? formatDateTime(valueB) : valueB || '(空欄)'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">バージョン A</div>
            <div className="text-sm font-semibold text-gray-900">
              {variantA.accountEmail}
            </div>
            <div className="text-xs text-gray-600 mt-1">{variantA.calendarName}</div>
            <div className="text-xs text-gray-500 mt-1">
              最終更新: {formatDateTime(variantA.lastModified)}
            </div>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <div className="text-xs font-medium text-gray-500 mb-1">バージョン B</div>
            <div className="text-sm font-semibold text-gray-900">
              {variantB.accountEmail}
            </div>
            <div className="text-xs text-gray-600 mt-1">{variantB.calendarName}</div>
            <div className="text-xs text-gray-500 mt-1">
              最終更新: {formatDateTime(variantB.lastModified)}
            </div>
          </div>
        </div>
      </div>

      {/* 差分表示 */}
      <div className="divide-y divide-gray-200">
        <FieldRow label="開始時刻" field="start" />
        <FieldRow label="終了時刻" field="end" />
        <FieldRow label="場所" field="location" />
        <FieldRow label="説明" field="description" />
      </div>

      {/* 変更箇所のハイライト説明 */}
      {[
        isDifferent('start'),
        isDifferent('end'),
        isDifferent('location'),
        isDifferent('description'),
      ].some(Boolean) && (
        <div className="bg-yellow-50 px-6 py-3 border-t border-yellow-200">
          <div className="flex items-center text-xs text-yellow-800">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            黄色でハイライトされた項目は、バージョン間で異なります
          </div>
        </div>
      )}
    </div>
  );
}

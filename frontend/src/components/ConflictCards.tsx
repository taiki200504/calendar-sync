import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { conflictService, Conflict } from '../services/conflictService';

export function ConflictCards() {
  const navigate = useNavigate();

  const { data: conflicts, isLoading } = useQuery<Conflict[]>({
    queryKey: ['conflicts'],
    queryFn: () => conflictService.getConflicts(),
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-4">読み込み中...</div>
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">競合予定</h2>
        <p className="text-gray-500 text-center py-4">競合はありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">競合予定</h2>
      <div className="space-y-4">
        {conflicts.map((conflict) => (
          <div
            key={conflict.canonicalId}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {conflict.title || 'Untitled Event'}
                </h3>
                <div className="space-y-1">
                  {conflict.variants.map((variant, index) => (
                    <div key={variant.eventLinkId} className="text-xs text-gray-600">
                      <span className="font-medium">{variant.accountEmail}</span>
                      {' / '}
                      <span>{variant.calendarName}</span>
                      {index < conflict.variants.length - 1 && (
                        <span className="mx-2 text-gray-400">vs</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {conflict.variants.length}つのアカウント間で差分があります
                </p>
              </div>
              <button
                onClick={() => navigate(`/conflicts/${conflict.canonicalId}`)}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                解決する
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '../../../services/calendarService';
import { ExclusionRule } from '../../../types';
import { useState } from 'react';

export function ExclusionRules() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    condition_type: 'title_contains' as 'title_contains' | 'title_not_contains' | 'location_matches',
    value: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['exclusion-rules'],
    queryFn: () => calendarService.getExclusionRules()
  });

  const createMutation = useMutation({
    mutationFn: (data: { condition_type: string; value: string }) =>
      calendarService.createExclusionRule(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusion-rules'] });
      setShowForm(false);
      setFormData({ condition_type: 'title_contains', value: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarService.deleteExclusionRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exclusion-rules'] });
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  const rules = data?.rules || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value.trim()) {
      alert('値を入力してください');
      return;
    }
    await createMutation.mutateAsync(formData);
  };

  const getConditionLabel = (type: string) => {
    switch (type) {
      case 'title_contains':
        return 'タイトルに含む';
      case 'title_not_contains':
        return 'タイトルに含まない';
      case 'location_matches':
        return '場所が一致';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">除外ルール一覧</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + ルール追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">新しい除外ルール</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                条件タイプ
              </label>
              <select
                value={formData.condition_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    condition_type: e.target.value as any
                  })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="title_contains">タイトルに含む</option>
                <option value="title_not_contains">タイトルに含まない</option>
                <option value="location_matches">場所が一致</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                値
              </label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="条件に一致する値を入力"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ condition_type: 'title_contains', value: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {createMutation.isPending ? '作成中...' : '作成'}
              </button>
            </div>
          </form>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">除外ルールが登録されていません</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {rules.map((rule: ExclusionRule) => (
              <li key={rule.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getConditionLabel(rule.condition_type)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">値: {rule.value}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      作成日: {new Date(rule.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('このルールを削除しますか？')) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

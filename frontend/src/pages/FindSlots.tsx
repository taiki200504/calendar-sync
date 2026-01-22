import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchFreeSlots } from '../services/api';
import { SearchParams, FreeSlot } from '../types';
import { SearchForm } from './components/SearchForm';
import { SlotResults } from './components/SlotResults';

export function FindSlots() {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);

  const { data: slots, isLoading, error } = useQuery<FreeSlot[]>({
    queryKey: ['freeSlots', searchParams],
    queryFn: () => searchFreeSlots(searchParams!),
    enabled: searchParams !== null,
  });

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
  };

  const handleCreateEvent = (slot: FreeSlot) => {
    // イベント作成はSlotCardコンポーネント内で処理される
    // ここでは成功時の通知などを行う
    console.log('Event created for slot:', slot);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">空き時間検索</h1>
        <p className="mt-2 text-sm text-gray-600">
          条件に合う空き時間を検索して、予定を作成できます
        </p>
      </div>

      <div className="mb-8">
        <SearchForm onSubmit={handleSearch} isLoading={isLoading} />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">
            エラーが発生しました: {error instanceof Error ? error.message : '不明なエラー'}
          </p>
        </div>
      )}

      {searchParams && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            検索結果
          </h2>
          <SlotResults
            slots={slots || []}
            isLoading={isLoading}
            onCreateEvent={handleCreateEvent}
          />
        </div>
      )}
    </div>
  );
}

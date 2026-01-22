import { FreeSlot } from '../../types';
import { SlotCard } from './SlotCard';

interface SlotResultsProps {
  slots: FreeSlot[];
  isLoading?: boolean;
  onCreateEvent: (slot: FreeSlot) => void;
}

export function SlotResults({ slots, isLoading = false, onCreateEvent }: SlotResultsProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">検索中...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          空き時間が見つかりませんでした
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          検索条件を変更して再度お試しください
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((slot, index) => (
        <SlotCard key={index} slot={slot} onCreateEvent={onCreateEvent} />
      ))}
    </div>
  );
}

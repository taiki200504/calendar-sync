import { useState } from 'react';
import { SearchParams } from '../../types';

interface SearchFormProps {
  onSubmit: (params: SearchParams) => void;
  isLoading?: boolean;
}

export function SearchForm({ onSubmit, isLoading = false }: SearchFormProps) {
  const [period, setPeriod] = useState<'thisWeek' | 'nextWeek' | 'custom'>('thisWeek');
  const [duration, setDuration] = useState<number>(60);
  const [businessHoursStart, setBusinessHoursStart] = useState<string>('09:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState<string>('18:00');
  const [buffer, setBuffer] = useState<number>(0);
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]); // 月〜金
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const weekdays = [
    { value: 0, label: '日' },
    { value: 1, label: '月' },
    { value: 2, label: '火' },
    { value: 3, label: '水' },
    { value: 4, label: '木' },
    { value: 5, label: '金' },
    { value: 6, label: '土' },
  ];

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleDayToggle = (day: number) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (period === 'custom') {
      if (!customStartDate) {
        newErrors.customStartDate = '開始日を選択してください';
      }
      if (!customEndDate) {
        newErrors.customEndDate = '終了日を選択してください';
      }
      if (customStartDate && customEndDate && customStartDate > customEndDate) {
        newErrors.customEndDate = '終了日は開始日より後である必要があります';
      }
    }

    if (businessHoursStart >= businessHoursEnd) {
      newErrors.businessHoursEnd = '終了時刻は開始時刻より後である必要があります';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const params: SearchParams = {
      period,
      duration,
      businessHoursStart,
      businessHoursEnd,
      buffer,
      preferredDays,
      ...(period === 'custom' && {
        customStartDate,
        customEndDate,
      }),
    };

    onSubmit(params);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        検索条件
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 期間選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            期間 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="thisWeek"
                checked={period === 'thisWeek'}
                onChange={(e) => setPeriod(e.target.value as 'thisWeek')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">今週</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="nextWeek"
                checked={period === 'nextWeek'}
                onChange={(e) => setPeriod(e.target.value as 'nextWeek')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">来週</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="custom"
                checked={period === 'custom'}
                onChange={(e) => setPeriod(e.target.value as 'custom')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">カスタム</span>
            </label>
          </div>
          {period === 'custom' && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.customStartDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.customStartDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.customStartDate}</p>
                )}
              </div>
              <div>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.customEndDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.customEndDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.customEndDate}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 所要時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            所要時間
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={30}>30分</option>
            <option value={60}>60分</option>
            <option value={90}>90分</option>
          </select>
        </div>

        {/* 営業時間 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              営業時間（開始）
            </label>
            <select
              value={businessHoursStart}
              onChange={(e) => setBusinessHoursStart(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              営業時間（終了）
            </label>
            <select
              value={businessHoursEnd}
              onChange={(e) => setBusinessHoursEnd(e.target.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.businessHoursEnd ? 'border-red-500' : ''
              }`}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.businessHoursEnd && (
              <p className="mt-1 text-sm text-red-600">{errors.businessHoursEnd}</p>
            )}
          </div>
        </div>

        {/* バッファ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            バッファ
          </label>
          <select
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={0}>0分</option>
            <option value={15}>15分</option>
            <option value={30}>30分</option>
          </select>
        </div>

        {/* 優先曜日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            優先曜日
          </label>
          <div className="flex flex-wrap gap-3">
            {weekdays.map((day) => (
              <label
                key={day.value}
                className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={preferredDays.includes(day.value)}
                  onChange={() => handleDayToggle(day.value)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {day.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 検索ボタン */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isLoading ? '検索中...' : '検索'}
          </button>
        </div>
      </form>
    </div>
  );
}

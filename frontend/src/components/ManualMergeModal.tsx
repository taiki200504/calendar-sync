import { useState } from 'react';
import { ConflictVariant, ConflictResolutionRequest } from '../types';

interface ManualMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolution: ConflictResolutionRequest) => void;
  variantA: ConflictVariant;
  variantB: ConflictVariant;
  title: string;
}

type FieldName = 'title' | 'start_at' | 'end_at' | 'location' | 'description';

export function ManualMergeModal({
  isOpen,
  onClose,
  onConfirm,
  variantA,
  variantB,
  title,
}: ManualMergeModalProps) {
  const [selectedFields, setSelectedFields] = useState<Record<FieldName, 'A' | 'B' | 'custom'>>({
    title: 'A',
    start_at: 'A',
    end_at: 'A',
    location: 'A',
    description: 'A',
  });

  const [customValues, setCustomValues] = useState<Record<FieldName, string>>({
    title: title,
    start_at: variantA.data.start,
    end_at: variantA.data.end,
    location: variantA.data.location || '',
    description: variantA.data.description || '',
  });

  if (!isOpen) return null;

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleFieldChange = (field: FieldName, value: 'A' | 'B' | 'custom') => {
    setSelectedFields((prev) => ({ ...prev, [field]: value }));
    if (value === 'A') {
      if (field === 'title') {
        setCustomValues((prev) => ({ ...prev, [field]: title }));
      } else if (field === 'start_at') {
        setCustomValues((prev) => ({ ...prev, [field]: variantA.data.start }));
      } else if (field === 'end_at') {
        setCustomValues((prev) => ({ ...prev, [field]: variantA.data.end }));
      } else if (field === 'location') {
        setCustomValues((prev) => ({ ...prev, [field]: variantA.data.location || '' }));
      } else if (field === 'description') {
        setCustomValues((prev) => ({ ...prev, [field]: variantA.data.description || '' }));
      }
    } else if (value === 'B') {
      if (field === 'title') {
        setCustomValues((prev) => ({ ...prev, [field]: title }));
      } else if (field === 'start_at') {
        setCustomValues((prev) => ({ ...prev, [field]: variantB.data.start }));
      } else if (field === 'end_at') {
        setCustomValues((prev) => ({ ...prev, [field]: variantB.data.end }));
      } else if (field === 'location') {
        setCustomValues((prev) => ({ ...prev, [field]: variantB.data.location || '' }));
      } else if (field === 'description') {
        setCustomValues((prev) => ({ ...prev, [field]: variantB.data.description || '' }));
      }
    }
  };

  const handleCustomValueChange = (field: FieldName, value: string) => {
    setCustomValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    const manualData: ConflictResolutionRequest['manualData'] = {};

    if (selectedFields.title === 'custom') {
      manualData.title = customValues.title;
    } else if (selectedFields.title === 'B') {
      manualData.title = title; // タイトルは同じなので、どちらでもOK
    }

    if (selectedFields.start_at === 'custom') {
      manualData.start_at = new Date(customValues.start_at).toISOString();
    } else if (selectedFields.start_at === 'A') {
      manualData.start_at = variantA.data.start;
    } else {
      manualData.start_at = variantB.data.start;
    }

    if (selectedFields.end_at === 'custom') {
      manualData.end_at = new Date(customValues.end_at).toISOString();
    } else if (selectedFields.end_at === 'A') {
      manualData.end_at = variantA.data.end;
    } else {
      manualData.end_at = variantB.data.end;
    }

    if (selectedFields.location === 'custom') {
      manualData.location = customValues.location;
    } else if (selectedFields.location === 'A') {
      manualData.location = variantA.data.location;
    } else {
      manualData.location = variantB.data.location;
    }

    if (selectedFields.description === 'custom') {
      manualData.description = customValues.description;
    } else if (selectedFields.description === 'A') {
      manualData.description = variantA.data.description;
    } else {
      manualData.description = variantB.data.description;
    }

    onConfirm({
      strategy: 'manual',
      manualData,
    });
  };

  const FieldRow = ({ field, label }: { field: FieldName; label: string }) => {
    const selected = selectedFields[field];
    const valueA =
      field === 'title'
        ? title
        : field === 'start_at'
        ? formatDateTime(variantA.data.start)
        : field === 'end_at'
        ? formatDateTime(variantA.data.end)
        : variantA.data[field as 'location' | 'description'] || '';
    const valueB =
      field === 'title'
        ? title
        : field === 'start_at'
        ? formatDateTime(variantB.data.start)
        : field === 'end_at'
        ? formatDateTime(variantB.data.end)
        : variantB.data[field as 'location' | 'description'] || '';

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name={field}
              value="A"
              checked={selected === 'A'}
              onChange={() => handleFieldChange(field, 'A')}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">A版</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={field}
              value="B"
              checked={selected === 'B'}
              onChange={() => handleFieldChange(field, 'B')}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">B版</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name={field}
              value="custom"
              checked={selected === 'custom'}
              onChange={() => handleFieldChange(field, 'custom')}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">カスタム</span>
          </label>
        </div>

        {selected === 'custom' && (
          <div className="mt-2">
            {field === 'title' ? (
              <input
                type="text"
                value={customValues.title}
                onChange={(e) => handleCustomValueChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : field === 'start_at' || field === 'end_at' ? (
              <input
                type="datetime-local"
                value={formatDateTime(customValues[field])}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  handleCustomValueChange(field, date.toISOString());
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <textarea
                value={customValues[field]}
                onChange={(e) => handleCustomValueChange(field, e.target.value)}
                rows={field === 'description' ? 4 : 2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        )}

        {/* プレビュー */}
        <div className="mt-2 p-3 bg-gray-50 rounded-md">
          <div className="text-xs font-medium text-gray-500 mb-1">プレビュー:</div>
          <div className="text-sm text-gray-900">
            {selected === 'A' ? valueA : selected === 'B' ? valueB : customValues[field]}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  手動マージ
                </h3>

                <div className="space-y-4">
                  <FieldRow field="title" label="タイトル" />
                  <FieldRow field="start_at" label="開始時刻" />
                  <FieldRow field="end_at" label="終了時刻" />
                  <FieldRow field="location" label="場所" />
                  <FieldRow field="description" label="説明" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              確定
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

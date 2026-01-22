import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conflictService } from '../services/conflictService';
import { ConflictDiff } from '../components/ConflictDiff';
import { ManualMergeModal } from '../components/ManualMergeModal';
import { ConflictResolutionRequest } from '../types';

export function ConflictDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showManualMerge, setShowManualMerge] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingResolution, setPendingResolution] = useState<ConflictResolutionRequest | null>(null);

  const { data: conflict, isLoading, error } = useQuery({
    queryKey: ['conflict', id],
    queryFn: () => conflictService.getConflict(id!),
    enabled: !!id,
  });

  const resolveMutation = useMutation({
    mutationFn: (resolution: ConflictResolutionRequest) =>
      conflictService.resolveConflict(id!, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['conflict', id] });
      navigate('/dashboard');
    },
  });

  const handleResolve = (resolution: ConflictResolutionRequest) => {
    setPendingResolution(resolution);
    setShowConfirmDialog(true);
  };

  const handleConfirmResolve = () => {
    if (pendingResolution) {
      resolveMutation.mutate(pendingResolution);
      setShowConfirmDialog(false);
      setPendingResolution(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error || !conflict) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600">競合情報の取得に失敗しました</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  if (conflict.variants.length < 2) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">競合情報が不完全です</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const variantA = conflict.variants[0];
  const variantB = conflict.variants[1];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          一覧に戻る
        </button>
        <h1 className="text-3xl font-bold text-gray-900">競合解決</h1>
        <p className="mt-2 text-sm text-gray-600">
          イベント: {conflict.title}
        </p>
      </div>

      {/* 差分表示 */}
      <div className="mb-6">
        <ConflictDiff variantA={variantA} variantB={variantB} />
      </div>

      {/* 解決アクション */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">解決方法を選択</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() =>
              handleResolve({
                strategy: 'adopt-A',
                adoptLinkId: variantA.eventLinkId,
              })
            }
            disabled={resolveMutation.isPending}
            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aを採用
          </button>
          <button
            onClick={() =>
              handleResolve({
                strategy: 'adopt-B',
                adoptLinkId: variantB.eventLinkId,
              })
            }
            disabled={resolveMutation.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bを採用
          </button>
          <button
            onClick={() => setShowManualMerge(true)}
            disabled={resolveMutation.isPending}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            手動マージ
          </button>
        </div>
      </div>

      {/* 手動マージモーダル */}
      {showManualMerge && (
        <ManualMergeModal
          isOpen={showManualMerge}
          onClose={() => setShowManualMerge(false)}
          onConfirm={(resolution) => {
            setShowManualMerge(false);
            handleResolve(resolution);
          }}
          variantA={variantA}
          variantB={variantB}
          title={conflict.title}
        />
      )}

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingResolution(null);
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      競合を解決しますか？
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        この変更を適用すると、全カレンダーに反映されます。よろしいですか？
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmResolve}
                  disabled={resolveMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolveMutation.isPending ? '処理中...' : '確定'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setPendingResolution(null);
                  }}
                  disabled={resolveMutation.isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

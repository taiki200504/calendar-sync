import { Request, Response, NextFunction } from 'express';
import { toAppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * グローバルエラーハンドラーミドルウェア
 * すべてのエラーを適切に処理し、クライアントに返す
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // レスポンスが既に送信されている場合は何もしない
  if (res.headersSent) {
    return next(err);
  }

  // エラーをAppErrorに変換
  const appError = toAppError(err);

  // ログ出力
  if (appError.isOperational) {
    logger.warn('Operational error occurred', {
      error: appError.message,
      statusCode: appError.statusCode,
      code: appError.code,
      path: req.path,
      method: req.method,
      stack: appError.stack
    });
  } else {
    logger.error('Unexpected error occurred', {
      error: appError.message,
      statusCode: appError.statusCode,
      code: appError.code,
      path: req.path,
      method: req.method,
      stack: appError.stack
    });
  }

  // クライアントに返すエラーレスポンス（500の原因特定のため path を常に含める）
  const response: {
    error: string;
    code?: string;
    path?: string;
    method?: string;
    stack?: string;
  } = {
    error: appError.message,
    path: req.path,
    method: req.method
  };

  // エラーコードがある場合は追加
  if (appError.code) {
    response.code = appError.code;
  }

  // 開発環境ではスタックトレースも返す
  if (process.env.NODE_ENV === 'development') {
    response.stack = appError.stack;
  }

  res.status(appError.statusCode).json(response);
};

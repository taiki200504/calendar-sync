/**
 * カスタムエラークラス
 * アプリケーション全体で使用するエラーの基底クラスとサブクラス
 */

/**
 * アプリケーションエラーの基底クラス
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // TypeScriptのErrorクラスの問題を修正
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * バリデーションエラー
 * 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, true, code || 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 認証エラー
 * 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '認証が必要です', code?: string) {
    super(message, 401, true, code || 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 認可エラー
 * 403 Forbidden
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'アクセス権限がありません', code?: string) {
    super(message, 403, true, code || 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * リソースが見つからないエラー
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string, code?: string) {
    const message = id 
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    super(message, 404, true, code || 'NOT_FOUND_ERROR');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 競合エラー
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 409, true, code || 'CONFLICT_ERROR');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 外部APIエラー
 * 502 Bad Gateway
 */
export class ExternalApiError extends AppError {
  constructor(service: string, message: string, code?: string) {
    super(`${service} API error: ${message}`, 502, true, code || 'EXTERNAL_API_ERROR');
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}

/**
 * データベースエラー
 * 500 Internal Server Error
 */
export class DatabaseError extends AppError {
  constructor(message: string, code?: string) {
    super(`Database error: ${message}`, 500, true, code || 'DATABASE_ERROR');
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * エラーがAppErrorのインスタンスかどうかをチェック
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * エラーをAppErrorに変換
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, false);
  }

  return new AppError('Unknown error occurred', 500, false);
}

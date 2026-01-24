import winston from 'winston';

/**
 * ロガー設定
 * 環境に応じてログレベルとフォーマットを変更
 */

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// カスタムフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// コンソール用のフォーマット（開発環境用）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Vercel Serverless Functionsかどうかを判定
const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;

// ロガーインスタンスの作成
const transports: winston.transport[] = [];

// Vercel環境ではファイルトランスポートを使用しない（ファイルシステムへの書き込みができない）
if (!isVercel) {
  // ローカル環境やDocker環境ではファイルに保存
  transports.push(
    // エラーログをファイルに保存
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat
    }),
    // すべてのログをファイルに保存
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: customFormat
    })
  );
}

// コンソールトランスポートを追加（すべての環境で使用）
if (process.env.NODE_ENV !== 'production' || isVercel) {
  // 開発環境またはVercel環境ではコンソールに出力
  transports.push(
    new winston.transports.Console({
      format: isVercel ? customFormat : consoleFormat
    })
  );
} else if (process.env.ENABLE_CONSOLE_LOG === 'true') {
  // 本番環境でコンソールログが有効な場合
  transports.push(
    new winston.transports.Console({
      format: customFormat
    })
  );
}

export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'calendar-sync-backend' },
  transports: transports,
  // 未処理の例外とリジェクトをキャッチ
  exceptionHandlers: isVercel
    ? [new winston.transports.Console({ format: customFormat })]
    : [new winston.transports.File({ filename: 'logs/exceptions.log' })],
  rejectionHandlers: isVercel
    ? [new winston.transports.Console({ format: customFormat })]
    : [new winston.transports.File({ filename: 'logs/rejections.log' })]
});

export default logger;

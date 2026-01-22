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

// ロガーインスタンスの作成
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'calendar-sync-backend' },
  transports: [
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
  ],
  // 未処理の例外とリジェクトをキャッチ
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// 開発環境ではコンソールにも出力
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat
    })
  );
}

// 本番環境でもコンソールに出力（Docker等でログを収集する場合）
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CONSOLE_LOG === 'true') {
  logger.add(
    new winston.transports.Console({
      format: customFormat
    })
  );
}

export default logger;

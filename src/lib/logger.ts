import pino from 'pino';

// ログレベルの型定義
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// 環境別ログ設定
const getLogConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // 本番環境では構造化ログ、開発環境では見やすい形式
  const transport = isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    }
  } : undefined;

  return {
    level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
    transport: isTest ? undefined : transport,
    base: {
      pid: undefined, // 本番環境以外ではプロセスIDを非表示
      hostname: undefined,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({
        level: label.toUpperCase()
      }),
    },
  };
};

// グローバルロガーの作成
export const logger = pino(getLogConfig());

// コンテキスト付きロガーの作成
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// 機密情報をマスキングするユーティリティ
export const sanitizeObject = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization', 
    'auth', 'api_key', 'apikey', 'access_token', 'refresh_token'
  ];

  const sanitized = { ...(obj as Record<string, unknown>) };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // 機密情報キーをマスキング
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
    // ネストされたオブジェクトも再帰的に処理
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
};

// エラーオブジェクトをログ用に変換
export const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }
  return { error: String(error) };
};

// API操作用の専用ロガー
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('DATABASE');
export const aiLogger = createLogger('AI_SERVICE');
export const appLogger = createLogger('APPLICATION');

// レガシーconsole.logからの移行支援
export const legacyLogger = {
  log: (...args: unknown[]) => {
    logger.info({ legacy: true }, args.join(' '));
  },
  error: (...args: unknown[]) => {
    logger.error({ legacy: true }, args.join(' '));
  },
  warn: (...args: unknown[]) => {
    logger.warn({ legacy: true }, args.join(' '));
  },
  debug: (...args: unknown[]) => {
    logger.debug({ legacy: true }, args.join(' '));
  },
};
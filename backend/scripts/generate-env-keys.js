#!/usr/bin/env node

/**
 * 環境変数のキーを生成するヘルパースクリプト
 * 
 * 使用方法:
 *   node scripts/generate-env-keys.js
 */

const crypto = require('crypto');

const separator = '='.repeat(60);
console.log(separator);
console.log('環境変数キー生成ツール');
console.log(separator);
console.log('');

// ENCRYPTION_KEY (32文字 = 16バイト)
const encryptionKey = crypto.randomBytes(16).toString('hex');
console.log('ENCRYPTION_KEY (32文字):');
console.log(encryptionKey);
console.log('');

// SESSION_SECRET (64文字 = 32バイト)
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('SESSION_SECRET (64文字):');
console.log(sessionSecret);
console.log('');

// JWT_SECRET (64文字 = 32バイト)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET (64文字):');
console.log(jwtSecret);
console.log('');

console.log(separator);
console.log('上記の値を .env ファイルにコピーしてください');
console.log(separator);

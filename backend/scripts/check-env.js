#!/usr/bin/env node

/**
 * 環境変数の設定を確認するスクリプト
 */

require('dotenv').config();

const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'ENCRYPTION_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
  'JWT_SECRET'
];

const optionalVars = [
  'PORT',
  'NODE_ENV',
  'FRONTEND_URL'
];

console.log('🔍 環境変数の確認中...\n');

let hasErrors = false;
const errors = [];
const warnings = [];

// 必須環境変数の確認
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    errors.push(`❌ ${varName}: 未設定`);
    hasErrors = true;
  } else {
    // 値の一部を表示（セキュリティのため）
    const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)} (${value.length}文字)`
      : value.length > 50 
        ? `${value.substring(0, 30)}... (${value.length}文字)`
        : value;
    
    // ENCRYPTION_KEYの長さチェック
    if (varName === 'ENCRYPTION_KEY' && value.length !== 32) {
      errors.push(`❌ ${varName}: 32文字である必要があります（現在: ${value.length}文字）`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  }
});

// オプション環境変数の確認
console.log('\n📋 オプション環境変数:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`⚠️  ${varName}: 未設定（デフォルト値を使用）`);
  }
});

// エラーと警告の表示
if (errors.length > 0) {
  console.log('\n❌ エラー:');
  errors.forEach(error => console.log(`  ${error}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  警告:');
  warnings.forEach(warning => console.log(`  ${warning}`));
}

// 結果のサマリー
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ 環境変数の設定に問題があります。');
  console.log('   上記のエラーを修正してから、再度お試しください。');
  process.exit(1);
} else {
  console.log('✅ すべての必須環境変数が設定されています。');
  process.exit(0);
}

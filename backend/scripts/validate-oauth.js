#!/usr/bin/env node

/**
 * OAuth設定の検証スクリプト
 */

require('dotenv').config();

console.log('🔍 OAuth設定の検証中...\n');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

let hasErrors = false;

// GOOGLE_CLIENT_IDの検証
console.log('1. GOOGLE_CLIENT_ID:');
if (!clientId || clientId.trim() === '') {
  console.log('   ❌ 未設定');
  hasErrors = true;
} else if (clientId === 'your-google-client-id' || clientId.includes('your-')) {
  console.log('   ❌ プレースホルダーのままです');
  console.log('   📝 実際のGoogle OAuth 2.0クライアントIDを設定してください');
  hasErrors = true;
} else if (!clientId.endsWith('.apps.googleusercontent.com')) {
  console.log('   ⚠️  形式が正しくない可能性があります');
  console.log('   📝 通常は ".apps.googleusercontent.com" で終わる必要があります');
} else {
  const displayId = `${clientId.substring(0, 20)}...${clientId.substring(clientId.length - 20)}`;
  console.log(`   ✅ 設定済み: ${displayId}`);
}

// GOOGLE_CLIENT_SECRETの検証
console.log('\n2. GOOGLE_CLIENT_SECRET:');
if (!clientSecret || clientSecret.trim() === '') {
  console.log('   ❌ 未設定');
  hasErrors = true;
} else if (clientSecret === 'your-google-client-secret' || clientSecret.includes('your-')) {
  console.log('   ❌ プレースホルダーのままです');
  console.log('   📝 実際のGoogle OAuth 2.0クライアントシークレットを設定してください');
  hasErrors = true;
} else {
  const displaySecret = `${clientSecret.substring(0, 8)}...${clientSecret.substring(clientSecret.length - 8)}`;
  console.log(`   ✅ 設定済み: ${displaySecret}`);
}

// GOOGLE_REDIRECT_URIの検証
console.log('\n3. GOOGLE_REDIRECT_URI:');
if (!redirectUri || redirectUri.trim() === '') {
  console.log('   ❌ 未設定');
  hasErrors = true;
} else {
  console.log(`   ✅ 設定済み: ${redirectUri}`);
  
  // 推奨値との比較
  const recommendedUri = 'http://localhost:3000/api/auth/google/callback';
  if (redirectUri !== recommendedUri) {
    console.log(`   ⚠️  推奨値と異なります: ${recommendedUri}`);
    console.log('   📝 Google Cloud Consoleの設定と一致しているか確認してください');
  }
}

// 結果のサマリー
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ OAuth設定に問題があります。');
  console.log('\n📚 設定手順は以下のファイルを参照してください:');
  console.log('   OAUTH_SETUP_GUIDE.md');
  console.log('\n🔗 Google Cloud Console:');
  console.log('   https://console.cloud.google.com/');
  process.exit(1);
} else {
  console.log('✅ OAuth設定は正しく設定されています。');
  console.log('\n💡 まだエラーが発生する場合は:');
  console.log('   1. Google Cloud ConsoleでOAuth 2.0クライアントIDが正しく作成されているか確認');
  console.log('   2. 承認済みのリダイレクトURIが正確に設定されているか確認');
  console.log('   3. OAuth同意画面が設定されているか確認');
  console.log('   4. Backendサーバーを再起動');
  process.exit(0);
}

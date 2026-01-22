#!/usr/bin/env node

/**
 * OAuth設定を対話的に設定するスクリプト
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupOAuth() {
  console.log('🔧 Google OAuth 2.0 設定セットアップ\n');
  console.log('このスクリプトは、backend/.envファイルのOAuth設定を更新します。\n');
  console.log('📚 事前準備:');
  console.log('   1. Google Cloud Console (https://console.cloud.google.com/) にアクセス');
  console.log('   2. プロジェクトを作成または選択');
  console.log('   3. Google Calendar APIを有効化');
  console.log('   4. OAuth 2.0 クライアントIDを作成');
  console.log('   5. クライアントIDとシークレットを取得\n');
  
  const continueSetup = await question('準備はできていますか？ (y/n): ');
  if (continueSetup.toLowerCase() !== 'y') {
    console.log('\n📖 詳細な手順は OAUTH_SETUP_GUIDE.md を参照してください。');
    rl.close();
    return;
  }

  console.log('\n--- OAuth認証情報の入力 ---\n');

  const clientId = await question('GOOGLE_CLIENT_ID を入力してください: ');
  if (!clientId || clientId.trim() === '' || clientId.includes('your-')) {
    console.log('❌ 無効なクライアントIDです。');
    rl.close();
    return;
  }

  const clientSecret = await question('GOOGLE_CLIENT_SECRET を入力してください: ');
  if (!clientSecret || clientSecret.trim() === '' || clientSecret.includes('your-')) {
    console.log('❌ 無効なクライアントシークレットです。');
    rl.close();
    return;
  }

  const redirectUri = await question(`GOOGLE_REDIRECT_URI (デフォルト: http://localhost:3000/api/auth/google/callback): `);
  const finalRedirectUri = redirectUri.trim() || 'http://localhost:3000/api/auth/google/callback';

  // .envファイルを読み込む
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else {
    console.log('⚠️  .envファイルが見つかりません。env.exampleから作成します。');
    const examplePath = path.join(__dirname, '..', 'env.example');
    if (fs.existsSync(examplePath)) {
      envContent = fs.readFileSync(examplePath, 'utf8');
    }
  }

  // 環境変数を更新
  const lines = envContent.split('\n');
  const updatedLines = lines.map(line => {
    if (line.startsWith('GOOGLE_CLIENT_ID=')) {
      return `GOOGLE_CLIENT_ID=${clientId.trim()}`;
    }
    if (line.startsWith('GOOGLE_CLIENT_SECRET=')) {
      return `GOOGLE_CLIENT_SECRET=${clientSecret.trim()}`;
    }
    if (line.startsWith('GOOGLE_REDIRECT_URI=')) {
      return `GOOGLE_REDIRECT_URI=${finalRedirectUri}`;
    }
    return line;
  });

  // 環境変数が存在しない場合は追加
  if (!envContent.includes('GOOGLE_CLIENT_ID=')) {
    updatedLines.push(`GOOGLE_CLIENT_ID=${clientId.trim()}`);
  }
  if (!envContent.includes('GOOGLE_CLIENT_SECRET=')) {
    updatedLines.push(`GOOGLE_CLIENT_SECRET=${clientSecret.trim()}`);
  }
  if (!envContent.includes('GOOGLE_REDIRECT_URI=')) {
    updatedLines.push(`GOOGLE_REDIRECT_URI=${finalRedirectUri}`);
  }

  const updatedContent = updatedLines.join('\n');

  // バックアップを作成
  if (fs.existsSync(envPath)) {
    const backupPath = `${envPath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, envContent);
    console.log(`\n💾 バックアップを作成しました: ${path.basename(backupPath)}`);
  }

  // .envファイルを更新
  fs.writeFileSync(envPath, updatedContent);

  console.log('\n✅ .envファイルを更新しました！\n');
  console.log('📋 設定内容:');
  console.log(`   GOOGLE_CLIENT_ID: ${clientId.substring(0, 20)}...${clientId.substring(clientId.length - 20)}`);
  console.log(`   GOOGLE_CLIENT_SECRET: ${clientSecret.substring(0, 8)}...${clientSecret.substring(clientSecret.length - 8)}`);
  console.log(`   GOOGLE_REDIRECT_URI: ${finalRedirectUri}\n`);

  console.log('⚠️  次のステップ:');
  console.log('   1. Backendサーバーを再起動してください');
  console.log('   2. 設定を検証: node scripts/validate-oauth.js');
  console.log('   3. ブラウザで http://localhost:5173 にアクセスしてログインを試してください\n');

  rl.close();
}

setupOAuth().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  rl.close();
  process.exit(1);
});

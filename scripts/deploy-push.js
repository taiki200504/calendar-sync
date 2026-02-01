#!/usr/bin/env node
/**
 * 変更をコミットしてプッシュし、Vercel の自動デプロイをトリガーする。
 * 使い方: npm run deploy  または  npm run deploy -- "コミットメッセージ"
 */
const { execSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const message = process.argv[2] || `Deploy: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: repoRoot, stdio: 'inherit', ...opts });
}

try {
  run('git add -A');
  run('git status --short');
  let hasChanges = false;
  try {
    run('git diff --staged --quiet', { stdio: 'pipe' });
  } catch {
    hasChanges = true;
  }
  if (hasChanges) {
    run(`git commit -m ${JSON.stringify(message)}`);
    run('git push');
    console.log('\n✅ プッシュ完了。Vercel が自動でデプロイします。');
  } else {
    run('git push');
    console.log('\n✅ プッシュ完了（変更なしで push のみ）。');
  }
  console.log('   状況: https://vercel.com/dashboard\n');
} catch (e) {
  console.error('\n⚠️ エラー:', e.message || e);
  process.exit(e.status ?? 1);
}

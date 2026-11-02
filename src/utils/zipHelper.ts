import JSZip from 'jszip';
import { AccountConfig, BotOperationSettings, DmTargetItem } from '../types';
import { accountMultiTabToBinary, accountsInfoToExcelBinary, dmTargetsToExcelBinary } from './excelHelper';
import { 
  PYTHON_SCRIPT_TEMPLATE, 
  PLAYWRIGHT_SCRIPT_TEMPLATE, 
  PLAYWRIGHT_DM_SCRIPT_TEMPLATE,
  SELENIUM_SCRIPT_TEMPLATE,
  BROWSER_REQUIREMENTS, 
  BROWSER_README,
  BATCH_START_TEMPLATE,
  BATCH_START_ROTATION_TEMPLATE,
  BATCH_START_DM_TEMPLATE,
  BATCH_SETUP_TEMPLATE,
  BATCH_BUILD_EXE_TEMPLATE,
  BATCH_TEST_ONE_TWEET_TEMPLATE,
  DEFAULT_SETTINGS,
  DEFAULT_DM_TARGETS,
} from '../data/defaultData';

export async function generatePythonProjectZip(
  accounts: AccountConfig[], 
  settings?: BotOperationSettings,
  dmTargets?: DmTargetItem[]
): Promise<void> {
  const currentSettings = settings || DEFAULT_SETTINGS;
  const currentDmTargets = dmTargets || DEFAULT_DM_TARGETS;
  const zip = new JSZip();

  // 0. バッチファイル (ダブルクリックで全自動起動)
  zip.file('START.bat', BATCH_START_TEMPLATE);
  zip.file('START_ROTATION.bat', BATCH_START_ROTATION_TEMPLATE);
  zip.file('START_DM.bat', BATCH_START_DM_TEMPLATE);
  zip.file('TEST_ONE_TWEET.bat', BATCH_TEST_ONE_TWEET_TEMPLATE);
  zip.file('SETUP.bat', BATCH_SETUP_TEMPLATE);
  zip.file('BUILD_EXE.bat', BATCH_BUILD_EXE_TEMPLATE);

  // 1. ブラウザ自動操縦スクリプト（提案1＆提案2対応）
  zip.file('auto_tweet_playwright.py', PLAYWRIGHT_SCRIPT_TEMPLATE);

  // 1.5. 自動DM＆フォロー用Playwrightスクリプト（提案1＆提案2対応）
  zip.file('auto_dm_playwright.py', PLAYWRIGHT_DM_SCRIPT_TEMPLATE);

  // 2. Selenium版ブラウザ自動操縦スクリプト
  zip.file('auto_tweet_selenium.py', SELENIUM_SCRIPT_TEMPLATE);

  // 3. 従来のTweepy API版スクリプト
  zip.file('auto_tweet_api.py', PYTHON_SCRIPT_TEMPLATE);

  // 3.5. Google Colaboratory用ノートブック
  const colabNotebook = {
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '# 𝕏 (Twitter) 自動ツイートツール (Google Colaboratory 版)\n',
          'PCにPythonをインストールすることなく、Googleの無料クラウド環境上でXへ自動投稿を実行できます。\n',
          '\n',
          '### 使い方\n',
          '1. **[セル1]** の再生ボタン（▶）を押して環境セットアップを実行します（約1分）。\n',
          '2. **[セル2]** の `AUTH_TOKEN` に、ご自身のブラウザから取得した `auth_token` を貼り付けます。\n',
          '3. **[セル2]** の再生ボタン（▶）を押すと、クラウド上で自動ログイン＆ツイートが実行されます！'
        ]
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          '# [セル1] 必要なライブラリとブラウザの自動インストール\n',
          '!pip install playwright pandas openpyxl\n',
          '!playwright install chromium\n',
          '!playwright install-deps\n',
          'print("✅ セットアップ完了！ [セル2] を実行してください。")'
        ]
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          '# [セル2] 𝕏 (Twitter) 自動ツイート実行スクリプト (提案1:ローテーション & 提案2:メディア遮断対応)\n',
          'import asyncio, time, random\n',
          'from playwright.async_api import async_playwright\n',
          '\n',
          'AUTH_TOKEN = "ここに取得したauth_tokenを貼り付けてください"\n',
          '\n',
          'TWEETS = [\n',
          ...accounts[0]?.tweets.filter(t => t.status !== 'posted').map(t => `    ${JSON.stringify(t.text)},\n`) || ['    "テスト投稿です！",\n'],
          ']\n',
          '\n',
          'async def run_colab():\n',
          '    async with async_playwright() as p:\n',
          '        browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])\n',
          '        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36")\n',
          '        await context.add_cookies([\n',
          '            {"name": "auth_token", "value": AUTH_TOKEN, "domain": ".x.com", "path": "/", "secure": True, "httpOnly": True},\n',
          '            {"name": "auth_token", "value": AUTH_TOKEN, "domain": ".twitter.com", "path": "/", "secure": True, "httpOnly": True}\n',
          '        ])\n',
          '        page = await context.new_page()\n',
          '        # 提案2: 画像・動画通信ブロックで超高速化\n',
          '        await page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font"] else route.continue_())\n',
          '        await page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=60000)\n',
          '        await page.wait_for_timeout(4000)\n',
          '        print("ログイン確認 URL:", page.url)\n',
          '        for idx, text in enumerate(TWEETS, 1):\n',
          '            print(f"[{idx}/{len(TWEETS)}] 投稿中: {text[:30]}...")\n',
          '            await page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=45000)\n',
          '            await page.wait_for_timeout(2500)\n',
          '            editor = await page.wait_for_selector(\'div[data-testid="tweetTextarea_0"]\', timeout=15000)\n',
          '            if editor:\n',
          '                await editor.click()\n',
          '                await editor.fill(text)\n',
          '                await page.wait_for_timeout(1000)\n',
          '                post_btn = await page.wait_for_selector(\'button[data-testid="tweetButton"]\', timeout=10000)\n',
          '                if post_btn and (await post_btn.is_enabled()):\n',
          '                    await post_btn.click()\n',
          '                    print(">> 投稿完了！")\n',
          '                    await page.wait_for_timeout(5000)\n',
          '            if idx < len(TWEETS):\n',
          '                await asyncio.sleep(30)\n',
          '        print("全ツイートの投稿が完了しました！")\n',
          '        await browser.close()\n',
          '\n',
          'await run_colab()\n'
        ]
      }
    ],
    metadata: { language_info: { name: 'python' } },
    nbformat: 4,
    nbformat_minor: 2
  };
  zip.file('x_auto_tweet_colab.ipynb', JSON.stringify(colabNotebook, null, 2));

  // 4. requirements.txt
  zip.file('requirements.txt', BROWSER_REQUIREMENTS);

  // 5. README.md
  zip.file('README.md', BROWSER_README);

  // 5.5. settings.json (提案1＆提案2の全体設定)
  zip.file('settings.json', JSON.stringify(currentSettings, null, 2));

  // 6. accounts.json (設定全般)
  const accountsJsonData = accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    handle: acc.handle,
    postMethod: acc.postMethod || 'browser',
    loginId: acc.loginId || '',
    loginPassword: acc.loginPassword || '',
    excelFileName: acc.excelFileName.endsWith('.xlsx') ? acc.excelFileName : `${acc.excelFileName}.xlsx`,
    minIntervalSec: (acc.intervalMinMinutes ? acc.intervalMinMinutes * 60 : acc.minIntervalSec),
    maxIntervalSec: (acc.intervalMaxMinutes ? acc.intervalMaxMinutes * 60 : acc.maxIntervalSec),
    intervalMinMinutes: acc.intervalMinMinutes || 1,
    intervalMaxMinutes: acc.intervalMaxMinutes || 10,
    activeTimeStart: acc.activeTimeStart || '0:00',
    activeTimeEnd: acc.activeTimeEnd || '0:00',
    tweetOrderMode: acc.tweetOrderMode !== undefined ? acc.tweetOrderMode : 1,
    repeatMode: acc.repeatMode,
    isActive: acc.isActive,
    actionsPerBatch: acc.actionsPerBatch || currentSettings.actionsPerRotation,
    apiKey: acc.apiKey || 'YOUR_API_KEY',
    apiSecret: acc.apiSecret || 'YOUR_API_SECRET',
    accessToken: acc.accessToken || 'YOUR_ACCESS_TOKEN',
    accessSecret: acc.accessSecret || 'YOUR_ACCESS_SECRET',
  }));
  zip.file('accounts.json', JSON.stringify(accountsJsonData, null, 2));

  // 6.5. アカウント情報.xlsx (アカウントID / アカウントpw)
  zip.file('アカウント情報.xlsx', accountsInfoToExcelBinary(accounts));

  // 6.6. dm_targets.xlsx (自動DM送信先リスト)
  zip.file('dm_targets.xlsx', dmTargetsToExcelBinary(currentDmTargets));

  // 7. 各アカウントごとの Excel ファイル (.xlsx) - 下タブ1: 設定、下タブ2: ツイート文章
  for (const acc of accounts) {
    const fileName = acc.excelFileName.endsWith('.xlsx') ? acc.excelFileName : `${acc.excelFileName}.xlsx`;
    const excelBinary = accountMultiTabToBinary(acc);
    zip.file(fileName, excelBinary);
  }

  // 8. images フォルダ (ダミープレースホルダー)
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    imagesFolder.file(
      'README_IMAGES.txt',
      'ここにエクセルで指定した画像ファイル（例: spring_collection.jpg など）を配置してください。\n相対パス "images/ファイル名.jpg" または絶対パスで指定できます。'
    );
  }

  // 9. browser_sessions フォルダ
  const sessionsFolder = zip.folder('browser_sessions');
  if (sessionsFolder) {
    sessionsFolder.file(
      'README_SESSIONS.txt',
      'Playwright / ブラウザ自動操縦を実行すると、このフォルダ配下にアカウント別のCookie・ログインセッションが自動保存されます。\nこれにより2回目以降の実行時はパスワード入力不要で即座に投稿できます。'
    );
  }

  // ZIP生成
  const content = await zip.generateAsync({ type: 'blob' });

  // ダウンロードトリガー
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'x_auto_tweet_browser_bot.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

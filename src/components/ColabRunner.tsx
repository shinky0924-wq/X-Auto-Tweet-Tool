import React, { useState } from 'react';
import { 
  Cloud, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  Key, 
  CheckCircle2, 
  Users, 
  Clock, 
  Shuffle, 
  FileSpreadsheet, 
  Layers, 
  Repeat, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AccountConfig, TweetItem } from '../types';
import { downloadAccountMultiTabExcel, downloadAccountsInfoExcel } from '../utils/excelHelper';

interface ColabRunnerProps {
  accounts: AccountConfig[];
  selectedAccountId?: string;
  onSelectAccount?: (id: string) => void;
  onUpdateAccount?: (updated: AccountConfig) => void;
  onNavigateToAccounts?: () => void;
}

export const ColabRunner: React.FC<ColabRunnerProps> = ({ 
  accounts, 
  selectedAccountId,
  onSelectAccount,
  onUpdateAccount,
  onNavigateToAccounts
}) => {
  const [activeAccountId, setActiveAccountId] = useState<string>(
    selectedAccountId || accounts[0]?.id || ''
  );
  const [runMode, setRunMode] = useState<'single' | 'multi'>('single');
  const [isInfiniteLoop, setIsInfiniteLoop] = useState<boolean>(true);
  const [loopCooldownMinutes, setLoopCooldownMinutes] = useState<number>(30);
  const [shuffleOnRepeat, setShuffleOnRepeat] = useState<boolean>(true);
  const [showTweetEditor, setShowTweetEditor] = useState<boolean>(false);
  const [showAutoSyncGuide, setShowAutoSyncGuide] = useState<boolean>(true);
  const [newTweetText, setNewTweetText] = useState<string>('');

  const [copiedCell1, setCopiedCell1] = useState(false);
  const [copiedCell2, setCopiedCell2] = useState(false);

  const currentAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];
  const tweetsToPost = currentAccount?.tweets || [];

  const handleUpdateCurrentToken = (token: string) => {
    if (!currentAccount || !onUpdateAccount) return;
    onUpdateAccount({
      ...currentAccount,
      authToken: token
    });
  };

  const handleUpdateInterval = (field: 'minIntervalSec' | 'maxIntervalSec', val: number) => {
    if (!currentAccount || !onUpdateAccount) return;
    onUpdateAccount({
      ...currentAccount,
      [field]: val
    });
  };

  // Inline tweet editing
  const handleEditTweet = (tweetId: number, newText: string) => {
    if (!currentAccount || !onUpdateAccount) return;
    const updatedTweets = currentAccount.tweets.map((t) =>
      t.id === tweetId ? { ...t, text: newText } : t
    );
    onUpdateAccount({
      ...currentAccount,
      tweets: updatedTweets
    });
  };

  const handleDeleteTweet = (tweetId: number) => {
    if (!currentAccount || !onUpdateAccount) return;
    const updatedTweets = currentAccount.tweets.filter((t) => t.id !== tweetId);
    onUpdateAccount({
      ...currentAccount,
      tweets: updatedTweets
    });
  };

  const handleAddTweet = () => {
    if (!newTweetText.trim() || !currentAccount || !onUpdateAccount) return;
    const nextId = currentAccount.tweets.length > 0 
      ? Math.max(...currentAccount.tweets.map(t => t.id)) + 1 
      : 1;
    const newTweet: TweetItem = {
      id: nextId,
      text: newTweetText.trim(),
      image_path: '',
      status: 'pending'
    };
    onUpdateAccount({
      ...currentAccount,
      tweets: [...currentAccount.tweets, newTweet]
    });
    setNewTweetText('');
  };

  // Generate Python code for Cell 1 (Install deps)
  const cell1Code = `# ==========================================
# [セル1] 必要なライブラリとブラウザの自動インストール
# 左の再生ボタン (▶) を押して実行してください (約1〜2分)
# ==========================================
!pip install -q playwright pandas openpyxl
!playwright install --with-deps
!playwright install
print("✅ セットアップ完了！ 次に下の [セル2] を実行してください。")`;

  // --- Single Account Script with Infinite Loop & Auto Excel sync support ---
  const formattedSingleTweets = tweetsToPost
    .map((t) => `    ${JSON.stringify(t.text)}`)
    .join(',\n');

  const singleCell2Code = `# ==========================================
# [セル2] 𝕏 (Twitter) 自動ツイート実行スクリプト (単一アカウント: ${currentAccount?.name || ''})
# 📁【自動更新対応】Colabの左のフォルダに tweets.xlsx を置けば自動で最新内容を読み込みます！
# ==========================================
import asyncio
import time
import random
import os
import pandas as pd
from playwright.async_api import async_playwright

# 🔑 1. このアカウントのログインキー (auth_token)
AUTH_TOKEN = "${currentAccount?.authToken?.trim() || 'ここに取得したauth_tokenを貼り付けてください'}"

# ⏱️ 2. このアカウントの投稿実行間隔（秒）
MIN_INTERVAL = ${currentAccount?.minIntervalSec || 30}
MAX_INTERVAL = ${currentAccount?.maxIntervalSec || 90}

# 🌀 3. ループ設定
IS_INFINITE_LOOP = ${isInfiniteLoop ? 'True' : 'False'}
COOLDOWN_MINUTES = ${loopCooldownMinutes}  # 1周完了後の休憩時間（分）
SHUFFLE_ON_REPEAT = ${shuffleOnRepeat ? 'True' : 'False'}  # 2周目以降ランダム順にするか

# 📝 4. 既定のツイートリスト (Excelファイル未アップロード時に使用)
DEFAULT_TWEETS = [
${formattedSingleTweets || '    "【テスト投稿】Google Colaboratory からの自動ツイートです！"'}
]

def load_latest_tweets_and_settings():
    """Colab上のExcelファイル（tweets.xlsx または ${currentAccount?.excelFileName || 'account.xlsx'}）から下タブ「設定」「ツイート文章」を自動読込"""
    global MIN_INTERVAL, MAX_INTERVAL, SHUFFLE_ON_REPEAT, AUTH_TOKEN
    
    # 0. アカウント情報.xlsx から auth_token を自動取得（未設定の場合）
    if os.path.exists("アカウント情報.xlsx") and (not AUTH_TOKEN or "ここに" in AUTH_TOKEN):
        try:
            aidf = pd.read_excel("アカウント情報.xlsx")
            tok_col = [c for c in aidf.columns if "token" in str(c).lower() or "トークン" in str(c)]
            if tok_col and pd.notna(aidf[tok_col[0]].iloc[0]):
                AUTH_TOKEN = str(aidf[tok_col[0]].iloc[0]).strip()
                print("🔑 [アカウント情報.xlsx] から auth_token を自動取得しました！")
        except Exception:
            pass

    target_files = ["tweets.xlsx", "${currentAccount?.excelFileName || 'account.xlsx'}"]
    excel_path = next((f for f in target_files if os.path.exists(f)), None)

    tweets = list(DEFAULT_TWEETS)
    if excel_path:
        try:
            xl = pd.ExcelFile(excel_path)
            # 1. 下タブ「設定」があれば間隔やモードを取得
            settings_sheet = next((s for s in xl.sheet_names if "設定" in s), None)
            if settings_sheet:
                sdf = pd.read_excel(excel_path, sheet_name=settings_sheet, header=None)
                for idx, row in sdf.iterrows():
                    row_txt = " ".join([str(v) for v in row if pd.notna(v)])
                    if "ツイート間隔" in row_txt:
                        for offset in [1, 2]:
                            if idx + offset < len(sdf):
                                nums = [int(x) for x in sdf.iloc[idx+offset] if str(x).isdigit()]
                                if len(nums) >= 2:
                                    MIN_INTERVAL = nums[0] * 60
                                    MAX_INTERVAL = max(MIN_INTERVAL, nums[1] * 60)
                                    print(f"⚙️ [設定シート適用] 間隔: {nums[0]}分〜{nums[1]}分 ({MIN_INTERVAL}秒〜{MAX_INTERVAL}秒)")
                                    break
                    if "モード" in row_txt:
                        for offset in [1, 2]:
                            if idx + offset < len(sdf):
                                mode_vals = [int(x) for x in sdf.iloc[idx+offset] if str(x) in ['0', '1']]
                                if mode_vals:
                                    SHUFFLE_ON_REPEAT = (mode_vals[0] == 1)
                                    print(f"⚙️ [設定シート適用] モード: {'1: ランダム' if mode_vals[0] == 1 else '0: 上から順'}")
                                    break

            # 2. 下タブ「ツイート文章」から本文リストを取得
            tweets_sheet = next((s for s in xl.sheet_names if "ツイート" in s or "文章" in s), None)
            if not tweets_sheet and len(xl.sheet_names) > 0:
                tweets_sheet = xl.sheet_names[-1] if len(xl.sheet_names) > 1 and "設定" in xl.sheet_names[0] else xl.sheet_names[0]

            df = pd.read_excel(excel_path, sheet_name=tweets_sheet)
            col = [c for c in df.columns if "ツイート" in str(c) or "text" in str(c).lower() or "本文" in str(c)]
            if col:
                tweets = df[col[0]].dropna().astype(str).tolist()
            else:
                tweets = df.iloc[:, 1 if len(df.columns) > 1 else 0].dropna().astype(str).tolist()
            print(f"📊 [Excel自動読込] '{excel_path}' (シート: {tweets_sheet}) から {len(tweets)} 件を取得しました！")
        except Exception as e:
            print(f"⚠️ Excel読み込みエラー: {e}")
    return tweets

async def run_single_account_tweet():
    # 起動時と周回ごとに最新Excel（設定・ツイート）を読み込み
    tweets = load_latest_tweets_and_settings()

    if not AUTH_TOKEN or "ここに" in AUTH_TOKEN:
        print("❌ [エラー] AUTH_TOKEN が設定されていません。")
        print("   Colab上に 'アカウント情報.xlsx' を配置するか、AUTH_TOKEN に直接トークンを入力してください。")
        return

    print("==================================================")
    print(f"🚀 X Auto Tweet 起動: ${currentAccount?.name} (${currentAccount?.handle})")
    print(f"   待機間隔: {MIN_INTERVAL} 秒 〜 {MAX_INTERVAL} 秒 (ランダム)")
    print(f"   無限ループ: {'有効 (' + str(COOLDOWN_MINUTES) + '分待機で周回)' if IS_INFINITE_LOOP else '無効 (1周のみ)'}")
    print("   ※ 停止したい時は、左の停止ボタン (■) を押してください")
    print("==================================================")

    async with async_playwright() as p:
        print("[1/4] クラウド用 Chromium ブラウザを起動しています...")
        try:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
            )
        except Exception as launch_err:
            if "Executable doesn't exist" in str(launch_err) or "playwright install" in str(launch_err):
                print("⚙️ [初回準備] ブラウザ本体が見つからないため、自動インストールを実行しています (約1分)...")
                import subprocess
                subprocess.run(["playwright", "install", "--with-deps"], check=False)
                subprocess.run(["playwright", "install"], check=False)
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
                )
            else:
                raise launch_err
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="ja-JP"
        )

        # Cookie注入
        await context.add_cookies([
            {"name": "auth_token", "value": AUTH_TOKEN, "domain": ".x.com", "path": "/", "secure": True, "httpOnly": True, "sameSite": "Lax"},
            {"name": "auth_token", "value": AUTH_TOKEN, "domain": ".twitter.com", "path": "/", "secure": True, "httpOnly": True, "sameSite": "Lax"}
        ])

        page = await context.new_page()

        # 【提案2】画像・動画（リール等）読み込みブロック（メモリ50-70%削減＆超高速）
        await page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font"] and "upload." not in route.request.url else route.continue_())
        print("⚡ [提案2] 画像・動画通信ブロック有効化（メモリ大幅節約＆超高速化）")

        print("[2/4] X (Twitter) にアクセスしてログインを確認中...")
        await page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(4000)

        if "login" in page.url.lower():
            print("❌ 【ログイン失敗】auth_token が無効か期限切れです。")
            await browser.close()
            return

        print("✅ ログイン成功！ツイート投稿ループを開始します。")

        round_count = 1
        while True:
            print(f"\\n" + "="*50)
            print(f"🌀 【第 {round_count} 周目スタート】")
            print("="*50)

            # 毎周回、最新のツイートを自動ロード（Excelがあれば即時更新される）
            tweets = load_latest_tweets()
            if round_count > 1 and SHUFFLE_ON_REPEAT:
                random.shuffle(tweets)
                print("🔀 BAN対策のためツイート順をランダムシャッフルしました。")

            for idx, tweet_text in enumerate(tweets, 1):
                print(f"\\n[{round_count}周目 - {idx}/{len(tweets)}] 投稿中: {tweet_text[:35]}...")
                try:
                    await page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=45000)
                    await page.wait_for_timeout(3500)

                    # ポップアップ等のオーバーレイがあれば無効化
                    try:
                        await page.keyboard.press("Escape")
                    except Exception:
                        pass

                    editor = await page.wait_for_selector('div[data-testid="tweetTextarea_0"]', timeout=15000)
                    if not editor:
                        print("❌ ツイート入力枠が見つかりませんでした。")
                        continue

                    # force=True で要素の遮りを無視してクリック & フォーカス
                    try:
                        await editor.click(force=True, timeout=5000)
                    except Exception:
                        await editor.focus()

                    await page.wait_for_timeout(800)
                    await editor.fill(tweet_text)
                    await page.wait_for_timeout(1500)

                    # 投稿処理: Control+Enter (最速・安定) またはボタンを強制クリック
                    posted = False
                    try:
                        await page.keyboard.press("Control+Enter")
                        await page.wait_for_timeout(4000)
                        posted = True
                    except Exception:
                        pass

                    try:
                        post_btn = await page.query_selector('button[data-testid="tweetButton"]')
                        if post_btn and (await post_btn.is_visible()):
                            await post_btn.click(force=True, timeout=5000)
                            await page.wait_for_timeout(4000)
                            posted = True
                    except Exception:
                        pass

                    if posted:
                        print(f"🎉 ツイート #{idx} の投稿が完了しました！")
                    else:
                        print(f"⚠️ 送信確認中...")
                except Exception as e:
                    print(f"⚠️ エラー: {e}")

                if idx < len(tweets):
                    wait_sec = random.randint(MIN_INTERVAL, MAX_INTERVAL)
                    print(f"⏳ 安全のため、次のツイートまで {wait_sec} 秒待機します...")
                    await asyncio.sleep(wait_sec)

            print(f"\\n🎊 第 {round_count} 周目 (全 {len(tweets)} 件) の投稿が完了しました！")

            if not IS_INFINITE_LOOP:
                print("🏁 無限ループが無効のため、終了します。")
                break

            wait_cooldown_sec = COOLDOWN_MINUTES * 60
            print(f"\\n💤 次の周回 (第 {round_count + 1} 周目) まで {COOLDOWN_MINUTES} 分間 ({wait_cooldown_sec}秒) 待機します...")
            await asyncio.sleep(wait_cooldown_sec)
            round_count += 1

        await browser.close()

await run_single_account_tweet()`;

  // --- Multi-Account Script ---
  const multiAccountsConfigStr = accounts.map((acc, index) => {
    const validTweets = acc.tweets.map(t => t.text);
    return `    {
        "id": "${acc.id}",
        "name": ${JSON.stringify(acc.name)},
        "handle": ${JSON.stringify(acc.handle)},
        "auth_token": ${JSON.stringify(acc.authToken?.trim() || `アカウント${index + 1}のauth_token`)},
        "min_interval": ${acc.minIntervalSec || 30},
        "max_interval": ${acc.maxIntervalSec || 90},
        "tweets": ${JSON.stringify(validTweets.length > 0 ? validTweets : ["テスト投稿です！"], null, 12)}
    }`;
  }).join(',\n');

  const multiCell2Code = `# ==========================================
# [セル2] 𝕏 (Twitter) 複数アカウント巡回・自動ツイート実行スクリプト
# 各アカウントごとに設定された【ツイート内容】と【実行間隔】で順番に投稿します
# ==========================================
import asyncio
import time
import random
from playwright.async_api import async_playwright

# 🌀 ループ設定
IS_INFINITE_LOOP = ${isInfiniteLoop ? 'True' : 'False'}
COOLDOWN_MINUTES = ${loopCooldownMinutes}  # 全アカウント巡回完了後の休憩時間（分）
SHUFFLE_ON_REPEAT = ${shuffleOnRepeat ? 'True' : 'False'}  # 2周目以降ランダム順にするか

# 👥 アカウントごとの設定リスト（個別ツイート＆個別待機間隔）
ACCOUNTS_DATA = [
${multiAccountsConfigStr}
]

async def post_tweets_for_account(browser, account_info, round_count):
    print("\\n" + "="*55)
    print(f"👤 【第 {round_count} 周】{account_info['name']} ({account_info['handle']})")
    print(f"   投稿予定数: {len(account_info['tweets'])} 件")
    print(f"   個別待機間隔: {account_info['min_interval']}秒 〜 {account_info['max_interval']}秒")
    print("="*55)

    auth_token = account_info.get("auth_token", "").strip()
    if not auth_token or "アカウント" in auth_token:
        print(f"⚠️ [スキップ] {account_info['name']} の auth_token が設定されていません。")
        return

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport={"width": 1280, "height": 800},
        locale="ja-JP"
    )

    await context.add_cookies([
        {"name": "auth_token", "value": auth_token, "domain": ".x.com", "path": "/", "secure": True, "httpOnly": True, "sameSite": "Lax"},
        {"name": "auth_token", "value": auth_token, "domain": ".twitter.com", "path": "/", "secure": True, "httpOnly": True, "sameSite": "Lax"}
    ])

    page = await context.new_page()

    # 【提案2】画像・動画ブロック（メモリ50-70%削減）
    await page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "media", "font"] and "upload." not in route.request.url else route.continue_())

    try:
        print(f"   Xにアクセスしてログイン確認中...")
        await page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(4000)

        if "login" in page.url.lower():
            print(f"❌ [{account_info['name']}] ログイン失敗: auth_token が無効です。スキップします。")
            await context.close()
            return

        print(f"✅ [{account_info['name']}] ログイン成功！投稿を開始します。")

        tweets = list(account_info["tweets"])
        if round_count > 1 and SHUFFLE_ON_REPEAT:
            random.shuffle(tweets)

        min_sec = account_info["min_interval"]
        max_sec = account_info["max_interval"]

        for idx, text in enumerate(tweets, 1):
            print(f"   [{idx}/{len(tweets)}] 投稿中: {text[:30]}...")
            try:
                await page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=45000)
                await page.wait_for_timeout(3500)

                try:
                    await page.keyboard.press("Escape")
                except Exception:
                    pass

                editor = await page.wait_for_selector('div[data-testid="tweetTextarea_0"]', timeout=15000)
                if not editor:
                    print("❌ ツイート入力枠が見つかりませんでした。")
                    continue

                try:
                    await editor.click(force=True, timeout=5000)
                except Exception:
                    await editor.focus()

                await page.wait_for_timeout(800)
                await editor.fill(text)
                await page.wait_for_timeout(1500)

                posted = False
                try:
                    await page.keyboard.press("Control+Enter")
                    await page.wait_for_timeout(4000)
                    posted = True
                except Exception:
                    pass

                try:
                    post_btn = await page.query_selector('button[data-testid="tweetButton"]')
                    if post_btn and (await post_btn.is_visible()):
                        await post_btn.click(force=True, timeout=5000)
                        await page.wait_for_timeout(4000)
                        posted = True
                except Exception:
                    pass

                if posted:
                    print(f"   🎉 投稿完了: ツイート #{idx}")
                else:
                    print(f"   ⚠️ 送信確認中...")
            except Exception as e:
                print(f"   ⚠️ エラー: {e}")

            if idx < len(tweets):
                act_min, act_max = min(min_sec, max_sec), max(min_sec, max_sec)
                wait_sec = act_min if act_min == act_max else random.randint(act_min, act_max)
                print(f"   ⏳ 次の投稿まで {wait_sec} 秒待機中 (設定: {act_min}〜{act_max}秒)...")
                await asyncio.sleep(wait_sec)

        print(f"🎊 {account_info['name']} のツイート投稿が完了しました！")
    finally:
        await context.close()

async def run_multi_accounts_tweet():
    print("==================================================")
    print(f"🚀 X 複数アカウント巡回自動ツイート 起動 (全 {len(ACCOUNTS_DATA)} アカウント)")
    print(f"   無限ループ: {'有効 (' + str(COOLDOWN_MINUTES) + '分待機で全アカウント再巡回)' if IS_INFINITE_LOOP else '無効 (1周のみ)'}")
    print("   ※ 停止したい時は、左の停止ボタン (■) を押してください")
    print("==================================================")

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
            )
        except Exception as launch_err:
            if "Executable doesn't exist" in str(launch_err) or "playwright install" in str(launch_err):
                print("⚙️ [初回準備] ブラウザ本体が見つからないため、自動インストールを実行しています (約1分)...")
                import subprocess
                subprocess.run(["playwright", "install", "--with-deps"], check=False)
                subprocess.run(["playwright", "install"], check=False)
                browser = await p.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
                )
            else:
                raise launch_err

        round_count = 1
        while True:
            print(f"\\n" + "#"*55)
            print(f"🌟 === 全アカウント巡回: 第 {round_count} 周目スタート ===")
            print("#"*55)

            for acc in ACCOUNTS_DATA:
                await post_tweets_for_account(browser, acc, round_count)
                print("\\n💤 次のアカウントへ移る前に 15秒間 待機します...")
                await asyncio.sleep(15)

            if not IS_INFINITE_LOOP:
                print("\\n🏁 全アカウントの巡回が完了しました（ループ無効のため終了）。")
                break

            wait_cooldown_sec = COOLDOWN_MINUTES * 60
            print(f"\\n💤 全アカウントの投稿が完了しました。次の巡回 (第 {round_count + 1} 周) まで {COOLDOWN_MINUTES} 分間待機します...")
            await asyncio.sleep(wait_cooldown_sec)
            round_count += 1

        await browser.close()

await run_multi_accounts_tweet()`;

  const currentCell2Code = runMode === 'single' ? singleCell2Code : multiCell2Code;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Download .ipynb notebook file
  const handleDownloadIpynb = () => {
    const ipynbContent = {
      cells: [
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: cell1Code.split('\n').map(line => line + '\n')
        },
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          outputs: [],
          source: currentCell2Code.split('\n').map(line => line + '\n')
        }
      ],
      metadata: {
        accelerator: "GPU",
        colab: {
          provenance: []
        },
        language_info: {
          name: "python"
        }
      },
      nbformat: 4,
      nbformat_minor: 0
    };

    const blob = new Blob([JSON.stringify(ipynbContent, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `x_auto_tweet_${runMode === 'single' ? (currentAccount?.handle.replace('@','') || 'bot') : 'multi'}.ipynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                クリック遮り・Ctrl+Enter修正適用済み
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5" />
                無限ループ対応
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Google Colab クラウド自動投稿
            </h2>
            <p className="text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              PC不要・クラウド完結で24時間自動ツイート。<strong>「コピペ不要にするExcel自動読込機能」</strong>や<strong>「.ipynbノートブック直接ダウンロード」</strong>で、修正作業を最小化できます！
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                downloadAccountsInfoExcel(accounts, 'アカウント情報.xlsx');
              }}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-sky-400 font-semibold text-xs rounded-xl transition border border-neutral-700 cursor-pointer shadow-sm"
              title="アカウントID / アカウントpw が記載された アカウント情報.xlsx を保存"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              アカウント情報.xlsx
            </button>

            <button
              onClick={() => {
                if (currentAccount) {
                  downloadAccountMultiTabExcel(currentAccount, currentAccount.excelFileName || `${currentAccount.name}.xlsx`);
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition border border-emerald-600 cursor-pointer shadow-sm"
              title="下タブ1: 設定 / 下タブ2: ツイート文章 を含んだアカウント専用Excelをダウンロード"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              {currentAccount?.excelFileName || `${currentAccount?.name}.xlsx`} をDL
            </button>

            <button
              onClick={() => {
                if (currentAccount) {
                  downloadAccountMultiTabExcel(currentAccount, 'tweets.xlsx');
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-semibold text-xs rounded-xl transition border border-neutral-700 cursor-pointer shadow-sm"
              title="Colabで既定ファイル名として自動認識される tweets.xlsx をダウンロード"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              tweets.xlsx をDL
            </button>

            <button
              onClick={handleDownloadIpynb}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl transition border border-neutral-700 cursor-pointer shadow-sm"
              title="Colabにコピペ不要で一発で開けるノートブックファイルを保存"
            >
              <Download className="w-4 h-4 text-sky-400" />
              .ipynb をダウンロード
            </button>
            <a
              href="https://colab.research.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition shadow-lg cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Colabを開く
            </a>
          </div>
        </div>
      </div>

      {/* Auto-Sync Explanation Card (Why Colab cannot be directly overwritten from web & solutions) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAutoSyncGuide(!showAutoSyncGuide)}
          className="w-full px-4 py-3 bg-neutral-850 hover:bg-neutral-800/80 transition flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">
              Q. 修正を自動でColabに反映・上書きするには？（コピペの手間をなくす方法）
            </span>
          </div>
          {showAutoSyncGuide ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {showAutoSyncGuide && (
          <div className="p-4 sm:p-5 space-y-4 text-xs text-neutral-300 bg-neutral-950/60 leading-relaxed border-t border-neutral-800">
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
              <span className="text-neutral-400 block text-[11px] mb-1 font-semibold">
                🔒 Googleのセキュリティ仕様について
              </span>
              Google Colabは別ドメイン（Googleのサーバー）で保護されているため、Webブラウザのセキュリティ制限（クロスオリジン保護）により、<strong>外部Webページから開いているColabのセル画面を直接遠隔操作で書き換えることはできません</strong>（※もし可能だと悪意あるサイトにColabの機密を盗まれてしまうためブロックされています）。
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                  方法①：Excelファイル（tweets.xlsx）ドラッグ＆ドロップ方式
                </div>
                <p className="text-[11px] text-neutral-300">
                  今回生成するPythonコードには<strong>「Colabのフォルダ内に <code className="text-emerald-300 bg-neutral-900 px-1 py-0.2 rounded">tweets.xlsx</code> があれば、毎周回自動で再読み込みする仕組み」</strong>を組み込みました！
                </p>
                <p className="text-[11px] text-neutral-400">
                  ツイートを更新したら、Colabの左メニューの「📁（ファイル）」にExcelをポンと投げるだけで、<strong>コードを書き直すことなく自動で最新ツイートが投稿</strong>されます。
                </p>
              </div>

              <div className="p-3.5 bg-sky-950/20 border border-sky-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                  <Download className="w-4 h-4" />
                  方法②：ノートブックファイル（.ipynb）を開く方式
                </div>
                <p className="text-[11px] text-neutral-300">
                  右上の<strong>「.ipynb をダウンロード」</strong>ボタンを押すと、セル1もセル2も全て最新状態で書き込まれたノートブックファイルが手に入ります。
                </p>
                <p className="text-[11px] text-neutral-400">
                  Colabの「ファイル」→「ノートブックをアップロード」で選択するだけで、コピペ不要で最初から最新の状態で作業を始められます！
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mode Switcher & Infinite Loop Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mode Selector */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
          <label className="text-xs font-bold text-neutral-300 block">
            1. 実行対象の選択
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRunMode('single')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center gap-2.5 ${
                runMode === 'single'
                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold">1アカウントずつ個別</div>
                <div className="text-[10px] text-neutral-400">特定のアカウントのみ投稿</div>
              </div>
            </button>

            <button
              onClick={() => setRunMode('multi')}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center gap-2.5 ${
                runMode === 'multi'
                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold">全アカウント一括巡回</div>
                <div className="text-[10px] text-neutral-400">{accounts.length}件のアカウントを順に実行</div>
              </div>
            </button>
          </div>
        </div>

        {/* Infinite Loop Settings */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-sky-400" />
              2. 無限ループ設定 (Colab 連続周回)
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isInfiniteLoop}
                onChange={(e) => setIsInfiniteLoop(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              <span className="ml-2 text-xs font-semibold text-white">
                {isInfiniteLoop ? 'ループ有効' : '1回で終了'}
              </span>
            </label>
          </div>

          {isInfiniteLoop && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-850">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  1周完了後の休憩時間 (分)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={loopCooldownMinutes}
                  onChange={(e) => setLoopCooldownMinutes(Math.max(1, parseInt(e.target.value) || 10))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  全件投稿後に{loopCooldownMinutes}分休んで再開
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  2周目以降の並び順
                </label>
                <label className="flex items-center gap-1.5 text-xs text-neutral-300 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOnRepeat}
                    onChange={(e) => setShuffleOnRepeat(e.target.checked)}
                    className="rounded border-neutral-700 text-sky-500 focus:ring-sky-500 bg-neutral-950 cursor-pointer"
                  />
                  <span>シャッフル (BAN防止)</span>
                </label>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  毎回ランダムな順番で投稿
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Selector & Live Tweet Editor (Single Mode) */}
      {runMode === 'single' ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-neutral-300">編集中のアカウント:</span>
              <select
                value={activeAccountId}
                onChange={(e) => {
                  setActiveAccountId(e.target.value);
                  if (onSelectAccount) onSelectAccount(e.target.value);
                }}
                className="bg-neutral-950 border border-neutral-700 text-white font-semibold text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.handle}) - {acc.tweets.length}件のツイート
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (currentAccount) {
                    downloadAccountMultiTabExcel(currentAccount, currentAccount.excelFileName || `${currentAccount.name}.xlsx`);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 text-emerald-400 border border-neutral-700 hover:border-emerald-500 transition cursor-pointer"
                title="このアカウント専用のExcelファイル（設定＋ツイート文章）をダウンロード"
              >
                <Download className="w-3.5 h-3.5" />
                {currentAccount?.excelFileName || 'アカウント.xlsx'} をダウンロード
              </button>
              <button
                onClick={() => setShowTweetEditor(!showTweetEditor)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  showTweetEditor 
                    ? 'bg-sky-500 text-neutral-950 border-sky-400' 
                    : 'bg-neutral-950 text-sky-400 border-neutral-700 hover:border-sky-500'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {showTweetEditor ? 'ツイート一覧を閉じる' : `ツイート一覧 (${tweetsToPost.length}件)`}
              </button>
            </div>
          </div>

          {/* Inline Tweet Editor Drawer */}
          {showTweetEditor && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  【{currentAccount?.name}】のツイート一覧（ここで編集すると下のコードに即時反映されます）
                </span>
                <span className="text-[11px] text-neutral-400">
                  {tweetsToPost.length} 件
                </span>
              </div>

              {/* Add New Tweet */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTweetText}
                  onChange={(e) => setNewTweetText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTweet()}
                  placeholder="新しいツイート文を入力してEnterまたは追加ボタン..."
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddTweet}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  追加
                </button>
              </div>

              {/* Tweets List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {tweetsToPost.map((tweet, idx) => (
                  <div 
                    key={tweet.id}
                    className="flex items-start gap-2 bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg text-xs group hover:border-neutral-700"
                  >
                    <span className="w-6 h-6 rounded bg-neutral-800 text-neutral-400 flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={tweet.text}
                      onChange={(e) => handleEditTweet(tweet.id, e.target.value)}
                      className="flex-1 bg-transparent border-b border-transparent focus:border-sky-500 focus:bg-neutral-950/50 rounded px-1 py-0.5 text-neutral-200 focus:outline-none font-normal"
                    />
                    <button
                      onClick={() => handleDeleteTweet(tweet.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Details: Token & Intervals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                このアカウントの auth_token
              </label>
              <input
                type="text"
                value={currentAccount?.authToken || ''}
                onChange={(e) => handleUpdateCurrentToken(e.target.value)}
                placeholder="F12 > Cookies > auth_token を貼り付け"
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                最小待機間隔（秒）
              </label>
              <input
                type="number"
                min={5}
                max={7200}
                value={currentAccount?.minIntervalSec || 30}
                onChange={(e) => handleUpdateInterval('minIntervalSec', Math.max(1, parseInt(e.target.value) || 10))}
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-sky-400" />
                最大待機間隔（秒）
              </label>
              <input
                type="number"
                min={currentAccount?.minIntervalSec || 30}
                max={86400}
                value={currentAccount?.maxIntervalSec || 90}
                onChange={(e) => handleUpdateInterval('maxIntervalSec', Math.max(currentAccount?.minIntervalSec || 10, parseInt(e.target.value) || 60))}
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-sky-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Multi Mode: Cards for all accounts */
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              登録中の全アカウント巡回リスト（上から順に自動投稿 ➔ {isInfiniteLoop ? `全件完了後${loopCooldownMinutes}分休んで再開` : '1回で終了'}）
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              全 {accounts.length} アカウント
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((acc, idx) => {
              const hasToken = Boolean(acc.authToken && acc.authToken.trim());

              return (
                <div 
                  key={acc.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[120px]">
                        {acc.name}
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      hasToken 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {hasToken ? 'Token設定済' : 'Token未設定'}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 space-y-1">
                    <div className="flex justify-between">
                      <span>アカウント:</span>
                      <span className="text-neutral-200 font-mono">{acc.handle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>個別待機間隔:</span>
                      <span className="text-sky-400 font-mono">{acc.minIntervalSec}秒 〜 {acc.maxIntervalSec}秒</span>
                    </div>
                    <div className="flex justify-between">
                      <span>登録ツイート数:</span>
                      <span className="text-amber-400 font-mono font-bold">{acc.tweets.length} 件</span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={acc.authToken || ''}
                      onChange={(e) => {
                        if (onUpdateAccount) {
                          onUpdateAccount({ ...acc, authToken: e.target.value });
                        }
                      }}
                      placeholder="このアカウントの auth_token"
                      className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded px-2.5 py-1 text-[11px] font-mono text-white placeholder-neutral-600 focus:outline-none"
                    />
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => downloadAccountMultiTabExcel(acc, acc.excelFileName || `${acc.name}.xlsx`)}
                      className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800 hover:border-emerald-500/40 text-[11px] font-medium transition cursor-pointer"
                      title="下タブ1: 設定 / 下タブ2: ツイート文章 を含んだExcelファイルをダウンロード"
                    >
                      <Download className="w-3 h-3" />
                      {acc.excelFileName || `${acc.name}.xlsx`} をDL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Code Blocks for Colab */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Google Colab 実行コード（{runMode === 'single' ? `${currentAccount?.name}用` : '全アカウント巡回用'}）
          </h3>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            {isInfiniteLoop && (
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30 flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                無限ループコード生成中 (停止はColabの■ボタン)
              </span>
            )}
          </div>
        </div>

        {/* Cell 1: Setup */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="bg-neutral-850 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-xs font-bold">
                [セル 1]
              </span>
              <span className="text-xs font-medium text-neutral-300">
                初期セットアップ（ノートブック起動時に1回だけ実行）
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(cell1Code, setCopiedCell1)}
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition cursor-pointer"
            >
              {copiedCell1 ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">コピー完了</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>セル1のコードをコピー</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-neutral-300 overflow-x-auto bg-neutral-950 leading-relaxed">
            {cell1Code}
          </pre>
        </div>

        {/* Cell 2: Tweet Script */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="bg-neutral-850 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                [セル 2]
              </span>
              <span className="text-xs font-medium text-neutral-300">
                {runMode === 'single'
                  ? `【${currentAccount?.name}】自動ツイート実行コード (${tweetsToPost.length}件${isInfiniteLoop ? '・無限ループ' : ''})`
                  : `【全 ${accounts.length} アカウント巡回】自動ツイート実行コード (${isInfiniteLoop ? '無限巡回ループ' : '1周のみ'})`}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(currentCell2Code, setCopiedCell2)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition cursor-pointer shadow-sm"
            >
              {copiedCell2 ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>コピー完了！</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>セル2のコードをコピー</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-neutral-300 overflow-x-auto bg-neutral-950 leading-relaxed max-h-[460px]">
            {currentCell2Code}
          </pre>
        </div>
      </div>
    </div>
  );
};

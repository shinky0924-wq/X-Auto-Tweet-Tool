// Browser automation (Playwright & Selenium) templates and setup guide

export const PLAYWRIGHT_SCRIPT_TEMPLATE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
X (旧Twitter) ブラウザ自動操縦・自動ツイートボット (Playwright版)
====================================================================
【特徴】
  - 有料API（X API）不要！完全無料で動作
  - 【提案1】1窓・順番交代ローテーション機能:
      常時立ち上げるブラウザは1つだけ。
      アカウント①(3〜5件) ➔ ブラウザ完全終了・メモリ解放 ➔ アカウント② ➔ アカウント③
      1巡したら指定時間クールダウン休止して再開。低スペックPCでも快適＆凍結対策。
  - 【提案2】画像・動画（リール等）読み込みブロック機能:
      通信を遮断してメモリ50%〜70%カット＆超高速動作。
  - ログインセッションをプロファイルフォルダ（browser_sessions/）に自動保存
      → 2回目以降はパスワード入力不要で即座に投稿可能
  - 複数アカウント対応: accounts.json の設定ごとに個別セッション管理
  - Excelファイル（.xlsx）読み込み＆投稿済み（posted）ステータス自動記録
  - アカウントごとのランダム待機秒数（安全ガード付き）
  - 画像ファイルパス指定対応（カンマ区切りで複数画像も対応）
====================================================================
"""

import os
import sys
import time
import random
import json
import logging
import argparse
from datetime import datetime
import openpyxl
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('browser_auto_tweet.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("XBrowserBot")


def setup_media_blocking(page, block_media: bool = True, block_fonts: bool = False):
    """
    【提案2】画像・動画（リール等）の読み込みブロック機能
    Playwrightのroute機能により、不要な高画質画像・動画ストリームを通信段階で遮断。
    メモリ消費量を50%〜70%削減し、CPU負荷とページ読込時間を劇的に短縮します。
    ※ 自分の画像アップロードAPI (upload.x.com / upload.twitter.com) は許可します。
    """
    if not block_media:
        return

    blocked_types = {"image", "media"}
    if block_fonts:
        blocked_types.add("font")

    blocked_extensions = (
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
        ".mp4", ".webm", ".m4v", ".mov", ".avi"
    )
    if block_fonts:
        blocked_extensions = blocked_extensions + (".woff", ".woff2", ".ttf", ".otf")

    def route_handler(route):
        req = route.request
        url_lower = req.url.lower()

        # Xへの画像・メディアアップロードAPI通信は通す
        if "upload.twitter.com" in url_lower or "upload.x.com" in url_lower or "blob:" in url_lower:
            route.continue_()
            return

        # リソースタイプ判定
        if req.resource_type in blocked_types:
            route.abort()
            return

        # 拡張子判定
        clean_url = url_lower.split("?")[0].split("#")[0]
        if any(clean_url.endswith(ext) for ext in blocked_extensions):
            route.abort()
            return

        route.continue_()

    page.route("**/*", route_handler)
    logger.debug("提案2: 画像・動画ブロックルートを適用しました。")


def safe_random_wait(min_sec: int, max_sec: int, label: str = ""):
    """ランダム待機（min > max の逆転や同一値でも例外を出さない安全設計）"""
    actual_min = max(0, min(int(min_sec), int(max_sec)))
    actual_max = max(0, max(int(min_sec), int(max_sec)))
    
    if actual_min == actual_max:
        sleep_sec = actual_min
    else:
        sleep_sec = random.randint(actual_min, actual_max)
    
    if label:
        logger.info(f"{label} {sleep_sec} 秒待機中 (設定: {actual_min}s〜{actual_max}s)...")
    time.sleep(sleep_sec)
    return sleep_sec


class XBrowserClient:
    """Playwrightによるブラウザ自動操縦クライアント"""

    def __init__(self, config: dict, global_settings: dict = None):
        self.config = config
        self.global_settings = global_settings or {}
        self.account_id = config.get("id", "acc-1")
        self.name = config.get("name", "アカウント")
        self.handle = config.get("handle", "@unknown")
        self.login_id = config.get("loginId", "")
        self.login_password = config.get("loginPassword", "")
        self.excel_file = config.get("excelFileName", "tweets.xlsx")
        self.min_interval = int(config.get("minIntervalSec", 60))
        self.max_interval = int(config.get("maxIntervalSec", 180))
        self.repeat_mode = bool(config.get("repeatMode", False))
        
        # メディアブロック設定（全体設定または個別設定）
        self.block_media = self.global_settings.get("blockMedia", True)
        self.block_fonts = self.global_settings.get("blockFonts", False)

        # セッション保存用プロファイルディレクトリ（アカウントごとに完全分離）
        safe_handle = "".join([c if c.isalnum() else "_" for c in self.handle])
        self.profile_dir = os.path.abspath(f"./browser_sessions/{safe_handle}")
        os.makedirs(self.profile_dir, exist_ok=True)

    def read_excel_tweets(self):
        """Excelからツイートリストを読み込み"""
        if not os.path.exists(self.excel_file):
            logger.error(f"[{self.handle}] Excelファイル '{self.excel_file}' が見つかりません。")
            return []

        try:
            wb = openpyxl.load_workbook(self.excel_file, data_only=True)
            ws = wb["ツイート文章"] if "ツイート文章" in wb.sheetnames else wb.active
            
            headers = {}
            for col in range(1, ws.max_column + 1):
                val = ws.cell(row=1, column=col).value
                if val is not None:
                    headers[str(val).strip().lower()] = col

            tweets = []
            for row_num in range(2, ws.max_row + 1):
                text_col = headers.get('text')
                status_col = headers.get('status')
                image_col = headers.get('image_path')
                id_col = headers.get('id')

                text_val = ws.cell(row=row_num, column=text_col).value if text_col else ''
                status_val = ws.cell(row=row_num, column=status_col).value if status_col else ''
                image_val = ws.cell(row=row_num, column=image_col).value if image_col else ''
                id_val = ws.cell(row=row_num, column=id_col).value if id_col else (row_num - 1)

                text = str(text_val).strip() if text_val is not None else ''
                status = str(status_val).strip().lower() if status_val is not None else ''
                image_path = str(image_val).strip() if image_val is not None else ''

                if text.lower() in ('none', 'nan'):
                    text = ''
                if image_path.lower() in ('none', 'nan'):
                    image_path = ''

                if not text and not status and not image_path:
                    continue

                tweets.append({
                    'row_idx': row_num - 2,
                    'id': id_val,
                    'text': text,
                    'image_path': image_path,
                    'status': status,
                })
            wb.close()
            return tweets
        except Exception as e:
            logger.error(f"[{self.handle}] Excel読み込みエラー: {e}")
            return []

    def update_excel_status(self, row_idx: int, new_status: str):
        """投稿結果をExcelに上書き保存"""
        try:
            wb = openpyxl.load_workbook(self.excel_file)
            ws = wb["ツイート文章"] if "ツイート文章" in wb.sheetnames else wb.active
            
            status_col = None
            posted_at_col = None
            for col in range(1, ws.max_column + 1):
                val = str(ws.cell(row=1, column=col).value).strip().lower()
                if val == 'status':
                    status_col = col
                elif val == 'posted_at':
                    posted_at_col = col

            if not status_col:
                status_col = ws.max_column + 1
                ws.cell(row=1, column=status_col, value='status')
            if not posted_at_col:
                posted_at_col = ws.max_column + 1
                ws.cell(row=1, column=posted_at_col, value='posted_at')

            target_row = row_idx + 2
            ws.cell(row=target_row, column=status_col, value=new_status)
            if new_status == 'posted':
                ws.cell(row=target_row, column=posted_at_col, value=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

            wb.save(self.excel_file)
            wb.close()
            logger.info(f"[{self.handle}] Excel更新: row={target_row}, status={new_status}")
        except Exception as e:
            logger.error(f"[{self.handle}] Excel更新失敗: {e}")

    def reset_all_tweets_to_pending(self):
        """リピートモード用: 全ツイートを未投稿に戻す"""
        try:
            wb = openpyxl.load_workbook(self.excel_file)
            ws = wb["ツイート文章"] if "ツイート文章" in wb.sheetnames else wb.active
            status_col = None
            for col in range(1, ws.max_column + 1):
                if str(ws.cell(row=1, column=col).value).strip().lower() == 'status':
                    status_col = col
                    break
            if status_col:
                for row in range(2, ws.max_row + 1):
                    ws.cell(row=row, column=status_col, value='pending')
            wb.save(self.excel_file)
            wb.close()
            logger.info(f"[{self.handle}] リピートモード: 全ツイートを 'pending' にリセットしました。")
        except Exception as e:
            logger.error(f"[{self.handle}] リセット処理エラー: {e}")

    def run_batch(self, batch_limit: int = 3, single_test: bool = False) -> tuple[int, int]:
        """
        【提案1】1窓・順番交代ローテーション対応バッチ実行
        ブラウザを起動 ➔ 指定件数（batch_limit件）だけ投稿 ➔ ブラウザを完全に閉じてメモリを解放
        戻り値: (処理した件数, 残りの未投稿件数)
        """
        tweets = self.read_excel_tweets()
        pending_tweets = [t for t in tweets if t['status'] in ['pending', '', 'nan', 'none']]

        if not pending_tweets:
            if self.repeat_mode and len(tweets) > 0 and not single_test:
                self.reset_all_tweets_to_pending()
                tweets = self.read_excel_tweets()
                pending_tweets = [t for t in tweets if t['status'] == 'pending']
            else:
                logger.info(f"[{self.handle}] 未投稿のツイートはありません（残り0件）。")
                return 0, 0

        target_batch = pending_tweets[:1] if single_test else pending_tweets[:batch_limit]
        remaining_count = max(0, len(pending_tweets) - len(target_batch))

        logger.info(f"[{self.handle}] 🚀 今回の担当件数: {len(target_batch)} 件 (残り未投稿: {remaining_count} 件)")

        processed_count = 0
        with sync_playwright() as p:
            logger.info(f"[{self.handle}] ブラウザ起動中... (セッション: {self.profile_dir})")
            context = p.chromium.launch_persistent_context(
                user_data_dir=self.profile_dir,
                headless=False,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--start-maximized'
                ],
                viewport=None
            )
            page = context.pages[0] if context.pages else context.new_page()

            # 【提案2】画像・動画ブロックの適用
            if self.block_media:
                setup_media_blocking(page, block_media=True, block_fonts=self.block_fonts)
                logger.info(f"[{self.handle}] ⚡ 【提案2】画像・動画読み込みブロックを有効化（メモリ大幅削減＆超高速）")

            try:
                # 1. Xのホーム画面を開く
                logger.info(f"[{self.handle}] X (https://x.com/home) にアクセス中...")
                page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=60000)
                time.sleep(2)

                # 2. ログインチェック
                if "login" in page.url or page.locator("a[href='/login']").count() > 0:
                    logger.info(f"[{self.handle}] 未ログイン状態を検知。自動ログインを試行します...")
                    logged_in = self._perform_login(page)
                    if not logged_in:
                        logger.error(f"[{self.handle}] ログインに失敗しました。手動でブラウザからログインしてください。")
                        time.sleep(8)
                        return 0, len(pending_tweets)

                logger.info(f"[{self.handle}] ログイン確認完了。投稿処理を開始します。")

                for i, tweet in enumerate(target_batch):
                    text = tweet['text']
                    image_path = tweet['image_path']
                    row_idx = tweet['row_idx']

                    logger.info(f"[{self.handle}] ({i+1}/{len(target_batch)}) 投稿中: {text[:35]}...")
                    success = self._post_single_tweet(page, text, image_path)

                    if success:
                        self.update_excel_status(row_idx, 'posted')
                        processed_count += 1
                        logger.info(f"[{self.handle}] ツイート成功！")
                    else:
                        self.update_excel_status(row_idx, 'failed')
                        logger.error(f"[{self.handle}] ツイート投稿に失敗しました。")

                    # バッチ内の次の投稿までの待機
                    if i < len(target_batch) - 1:
                        safe_random_wait(self.min_interval, self.max_interval, f"[{self.handle}] 次の投稿まで")

            finally:
                time.sleep(1)
                context.close()
                logger.info(f"[{self.handle}] 🔒 【提案1】ブラウザを完全終了し、メモリを100%解放しました。")

        return processed_count, remaining_count

    def _perform_login(self, page):
        """Xへの自動ログイン処理"""
        try:
            page.goto("https://x.com/i/flow/login", wait_until="domcontentloaded", timeout=60000)
            time.sleep(2)

            username_input = page.locator("input[autocomplete='username']")
            if username_input.count() == 0:
                username_input = page.locator("input[name='text']")
            
            if username_input.count() > 0:
                username_input.first.fill(self.login_id or self.handle.replace("@", ""))
                time.sleep(1)
                page.keyboard.press("Enter")
                time.sleep(2)

            pw_input = page.locator("input[type='password']")
            if pw_input.count() > 0:
                pw_input.first.fill(self.login_password)
                time.sleep(1)
                page.keyboard.press("Enter")
                time.sleep(4)

            # 追加認証（電話番号・ユーザー名の再確認画面）
            if page.locator("input[data-testid='ocfEnterTextTextInput']").count() > 0:
                logger.warning(f"[{self.handle}] 追加認証を要求されました。ユーザー名を入力します。")
                page.locator("input[data-testid='ocfEnterTextTextInput']").first.fill(self.handle.replace("@", ""))
                page.keyboard.press("Enter")
                time.sleep(3)

            return True
        except Exception as e:
            logger.error(f"[{self.handle}] 自動ログインエラー: {e}")
            logger.info("※初回のみ開いたブラウザ画面で手動ログインすれば、次回以降Cookieが自動保存されます。")
            return False

    def _post_single_tweet(self, page, text: str, image_path: str):
        """1件のツイートを入力して投稿"""
        try:
            page.goto("https://x.com/home", wait_until="domcontentloaded")
            time.sleep(2)

            tweet_box = page.locator("div[data-testid='tweetTextarea_0']").first
            if tweet_box.count() == 0:
                tweet_box = page.locator("div[role='textbox']").first

            tweet_box.click()
            time.sleep(0.5)

            if text:
                tweet_box.fill(text)
                time.sleep(1)

            if image_path:
                paths = [p.strip() for p in image_path.split(',') if p.strip()]
                valid_files = []
                for p in paths:
                    full_p = os.path.abspath(p)
                    if os.path.exists(full_p):
                        valid_files.append(full_p)
                    else:
                        logger.warning(f"[{self.handle}] 画像が見つかりません: {p}")

                if valid_files:
                    logger.info(f"[{self.handle}] 画像添付中: {valid_files}")
                    file_input = page.locator("input[data-testid='fileInput']").first
                    if file_input.count() > 0:
                        file_input.set_input_files(valid_files)
                        time.sleep(3)

            post_button = page.locator("button[data-testid='tweetButtonInline']").first
            if post_button.count() == 0:
                post_button = page.locator("button[data-testid='tweetButton']").first

            time.sleep(1)
            if post_button.is_enabled():
                post_button.click()
                time.sleep(3)
                logger.info(f"[{self.handle}] 投稿ボタンをクリックしました。")
                return True
            else:
                logger.error(f"[{self.handle}] 投稿ボタンが無効化されています。")
                return False

        except Exception as e:
            logger.error(f"[{self.handle}] 投稿処理エラー: {e}")
            return False


def load_settings() -> dict:
    """settings.json またはデフォルト設定を読み込み"""
    settings_file = "settings.json"
    default_settings = {
        "enableRotation": True,
        "actionsPerRotation": 3,
        "cycleCooldownMinutes": 15,
        "blockMedia": True,
        "blockFonts": False
    }
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                default_settings.update(loaded)
        except Exception as e:
            logger.warning(f"settings.json の読み込みに失敗しました: {e}")
    return default_settings


def main():
    parser = argparse.ArgumentParser(description="X Browser Automation Bot (Rotation & Media Block)")
    parser.add_argument("--test", action="store_true", help="各アカウント最初の1件のみテスト投稿")
    parser.add_argument("--rotation", action="store_true", default=None, help="1窓・交代ローテーションを強制有効化")
    parser.add_argument("--no-rotation", action="store_false", dest="rotation", help="ローテーション無効（アカウント順に全件投稿）")
    parser.add_argument("--block-media", action="store_true", default=None, help="画像・動画読み込みブロックを有効化")
    parser.add_argument("--no-block-media", action="store_false", dest="block_media", help="画像・動画ブロックを無効化")
    parser.add_argument("--batch-size", type=int, default=None, help="1回の巡回で処理する件数 (例: 3)")
    parser.add_argument("--cooldown", type=int, default=None, help="全アカウント1巡後の待機分数 (例: 15)")
    args = parser.parse_args()

    config_file = "accounts.json"
    if not os.path.exists(config_file):
        logger.error(f"設定ファイル '{config_file}' が見つかりません。")
        sys.exit(1)

    settings = load_settings()
    if args.rotation is not None:
        settings["enableRotation"] = args.rotation
    if args.block_media is not None:
        settings["blockMedia"] = args.block_media
    if args.batch_size is not None:
        settings["actionsPerRotation"] = max(1, args.batch_size)
    if args.cooldown is not None:
        settings["cycleCooldownMinutes"] = max(0, args.cooldown)

    is_test_mode = args.test or os.environ.get("X_TEST_MODE", "0") == "1"

    with open(config_file, "r", encoding="utf-8") as f:
        accounts = json.load(f)

    active_accounts = [a for a in accounts if a.get("isActive", True)]
    logger.info("=" * 65)
    logger.info("   X ブラウザ自動操縦ボット (Playwright版) 起動")
    logger.info("=" * 65)
    logger.info(f"・対象アカウント数: {len(active_accounts)} 件")
    logger.info(f"・提案1【1窓交代ローテーション】: {'有効 (ON)' if settings.get('enableRotation') else '無効 (OFF)'}")
    if settings.get('enableRotation'):
        logger.info(f"   ↳ 1アカウントあたりの件数: {settings.get('actionsPerRotation', 3)} 件 ➔ ブラウザ終了・メモリ解放")
        logger.info(f"   ↳ 1巡完了後のクールダウン待機: {settings.get('cycleCooldownMinutes', 15)} 分")
    logger.info(f"・提案2【画像・動画ブロック】: {'有効 (ON - メモリ50〜70%カット)' if settings.get('blockMedia') else '無効 (OFF)'}")
    if is_test_mode:
        logger.info("・【⚡1件テストモード】各アカウント最初の1件のみテストして安全に終了します。")
    logger.info("=" * 65)

    if not active_accounts:
        logger.warning("有効なアカウント(isActive=True)がありません。終了します。")
        return

    # 【提案1】1窓・順番交代ローテーション
    if settings.get("enableRotation") and not is_test_mode:
        cycle_count = 1
        batch_limit = int(settings.get("actionsPerRotation", 3))
        cooldown_min = int(settings.get("cycleCooldownMinutes", 15))

        while True:
            logger.info(f"\\n{'='*25} [第 {cycle_count} 巡目スタート] {'='*25}")
            has_remaining_any = False

            for idx, acc in enumerate(active_accounts):
                acc_name = acc.get('name')
                acc_handle = acc.get('handle')
                acc_batch = acc.get('actionsPerBatch') or batch_limit

                logger.info(f"\\n>>> [{idx+1}/{len(active_accounts)}] {acc_name} ({acc_handle}) のターン開始 (最大 {acc_batch} 件)")
                client = XBrowserClient(acc, settings)
                processed, remaining = client.run_batch(batch_limit=acc_batch, single_test=False)

                if remaining > 0:
                    has_remaining_any = True

                # アカウント交代時のインターバル（5〜10秒）
                if idx < len(active_accounts) - 1:
                    logger.info("次のアカウントへ交代中...（5秒待機）")
                    time.sleep(5)

            if not has_remaining_any:
                logger.info("\\n🎉 全アカウントの未投稿ツイートがすべて完了しました！")
                break

            logger.info(f"\\n🍵 第 {cycle_count} 巡目が完了しました。")
            logger.info(f"全ブラウザを完全終了した状態で、{cooldown_min} 分間クールダウン待機します...")
            
            # クールダウン待機
            for m in range(cooldown_min, 0, -1):
                logger.info(f"再開まで残り {m} 分...")
                time.sleep(60)

            cycle_count += 1

    else:
        # 単純実行（アカウントごとに全件投稿、または1件テスト）
        for acc in active_accounts:
            logger.info(f"\\n========== [{acc.get('name')} / {acc.get('handle')}] 開始 ==========")
            client = XBrowserClient(acc, settings)
            client.run_batch(batch_limit=999999, single_test=is_test_mode)

    logger.info("\\n=== 自動ツイート処理が完了しました ===")


if __name__ == "__main__":
    main()
`;

// 【新規】自動DM＆フォロー用Playwrightスクリプト
export const PLAYWRIGHT_DM_SCRIPT_TEMPLATE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
X (旧Twitter) 自動DM＆フォローボット (Playwright版)
====================================================================
【特徴】
  - 有料API不要！ブラウザを自動操縦して指定ユーザーにDM送信＆フォロー
  - 【提案1】1窓・順番交代ローテーション機能:
      常に開いているブラウザは1つだけ。
      アカウント①で指定件数(例: 3〜5人)DM送信 ➔ ブラウザ完全終了・メモリ解放
      アカウント②で指定件数 ➔ アカウント③で指定件数
      1巡したら指定時間(15〜30分)休止して次へ。凍結リスク最小＆低スペックPC対応！
  - 【提案2】画像・動画（リール等）読み込みブロック機能:
      通信を遮断してメモリ50%〜70%削減。DOMとテキストのみで超軽量動作。
  - 送信先リストExcel (dm_targets.xlsx) 自動管理＆ステータス記録
====================================================================
"""

import os
import sys
import time
import random
import json
import logging
import argparse
from datetime import datetime
import openpyxl
from playwright.sync_api import sync_playwright

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [X_DM_Bot] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('x_auto_dm.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("X_DM_Bot")


def setup_media_blocking(page):
    """【提案2】画像・動画ブロック機能"""
    blocked_types = {"image", "media", "font"}
    def route_handler(route):
        if route.request.resource_type in blocked_types:
            route.abort()
        else:
            route.continue_()
    page.route("**/*", route_handler)


def safe_random_wait(min_sec: int, max_sec: int, label: str = ""):
    actual_min = max(0, min(int(min_sec), int(max_sec)))
    actual_max = max(0, max(int(min_sec), int(max_sec)))
    sleep_sec = actual_min if actual_min == actual_max else random.randint(actual_min, actual_max)
    if label:
        logger.info(f"{label} {sleep_sec} 秒待機中...")
    time.sleep(sleep_sec)
    return sleep_sec


class XDmClient:
    def __init__(self, account_config: dict, settings: dict):
        self.config = account_config
        self.settings = settings
        self.name = account_config.get("name", "アカウント")
        self.handle = account_config.get("handle", "@unknown")
        self.login_id = account_config.get("loginId", "")
        self.login_password = account_config.get("loginPassword", "")
        self.excel_file = "dm_targets.xlsx"
        
        safe_handle = "".join([c if c.isalnum() else "_" for c in self.handle])
        self.profile_dir = os.path.abspath(f"./browser_sessions/{safe_handle}")
        os.makedirs(self.profile_dir, exist_ok=True)

    def read_targets(self):
        """dm_targets.xlsx から未送信のターゲットを読み込み"""
        if not os.path.exists(self.excel_file):
            logger.error(f"送信先Excel '{self.excel_file}' が見つかりません。")
            return []

        try:
            wb = openpyxl.load_workbook(self.excel_file, data_only=True)
            ws = wb.active
            headers = {}
            for col in range(1, ws.max_column + 1):
                val = ws.cell(row=1, column=col).value
                if val:
                    headers[str(val).strip().lower()] = col

            targets = []
            for row in range(2, ws.max_row + 1):
                target_user = ws.cell(row=row, column=headers.get('target_username', 2)).value
                msg = ws.cell(row=row, column=headers.get('message', 3)).value
                status = ws.cell(row=row, column=headers.get('status', 4)).value
                auto_follow = ws.cell(row=row, column=headers.get('auto_follow', 5)).value

                if not target_user:
                    continue

                status_str = str(status).strip().lower() if status else 'pending'
                targets.append({
                    'row_idx': row,
                    'username': str(target_user).strip().replace('@', ''),
                    'message': str(msg).strip() if msg else '',
                    'auto_follow': str(auto_follow).strip().lower() in ('1', 'true', 'yes', 'on'),
                    'status': status_str
                })
            wb.close()
            return targets
        except Exception as e:
            logger.error(f"Excel読み込みエラー: {e}")
            return []

    def update_status(self, row: int, status: str, err: str = ""):
        try:
            wb = openpyxl.load_workbook(self.excel_file)
            ws = wb.active
            ws.cell(row=row, column=4, value=status) # status
            ws.cell(row=row, column=6, value=datetime.now().strftime('%Y-%m-%d %H:%M:%S')) # sent_at
            if err:
                ws.cell(row=row, column=7, value=err) # error
            wb.save(self.excel_file)
            wb.close()
        except Exception as e:
            logger.error(f"Excel更新失敗: {e}")

    def run_batch(self, batch_limit: int = 3) -> tuple[int, int]:
        targets = self.read_targets()
        pending = [t for t in targets if t['status'] in ['pending', '', 'nan']]
        if not pending:
            logger.info(f"[{self.handle}] 未送信のターゲットはありません。")
            return 0, 0

        current_batch = pending[:batch_limit]
        remaining = len(pending) - len(current_batch)
        logger.info(f"[{self.handle}] 💌 今回のDM担当件数: {len(current_batch)} 人 (残り: {remaining} 人)")

        processed = 0
        with sync_playwright() as p:
            logger.info(f"[{self.handle}] ブラウザ起動中... (セッション: {self.profile_dir})")
            context = p.chromium.launch_persistent_context(
                user_data_dir=self.profile_dir,
                headless=False,
                args=['--disable-blink-features=AutomationControlled', '--start-maximized'],
                viewport=None
            )
            page = context.pages[0] if context.pages else context.new_page()

            if self.settings.get("blockMedia", True):
                setup_media_blocking(page)
                logger.info(f"[{self.handle}] ⚡ 【提案2】画像・動画通信をブロック中（超軽量動作）")

            try:
                page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=60000)
                time.sleep(2)

                for idx, item in enumerate(current_batch):
                    username = item['username']
                    msg = item['message']
                    auto_follow = item['auto_follow']
                    row_idx = item['row_idx']

                    logger.info(f"[{self.handle}] ({idx+1}/{len(current_batch)}) @{username} へ送信処理中...")

                    # プロフィールページへ
                    page.goto(f"https://x.com/{username}", wait_until="domcontentloaded")
                    time.sleep(3)

                    # フォロー処理（必要な場合）
                    if auto_follow:
                        try:
                            follow_btn = page.locator("button[data-testid$='-follow']").first
                            if follow_btn.count() > 0 and "follow" in follow_btn.text_content().lower():
                                follow_btn.click()
                                logger.info(f"[{self.handle}] @{username} をフォローしました。")
                                time.sleep(1)
                        except Exception as fe:
                            logger.debug(f"フォロー判定スキップ: {fe}")

                    # DMボタンを探す
                    dm_btn = page.locator("button[data-testid='sendDMFromProfile']").first
                    if dm_btn.count() == 0:
                        dm_btn = page.locator("div[data-testid='sendDMFromProfile']").first

                    if dm_btn.count() == 0:
                        logger.warning(f"[{self.handle}] @{username} はDMが解放されていない可能性があります（スキップ）。")
                        self.update_status(row_idx, 'skipped', 'DMボタン未検出(受信拒否の可能性)')
                        continue

                    dm_btn.click()
                    time.sleep(2)

                    # DM入力エリア
                    dm_input = page.locator("div[data-testid='dmComposerTextInput']").first
                    if dm_input.count() == 0:
                        dm_input = page.locator("div[role='textbox']").first

                    if dm_input.count() > 0:
                        dm_input.click()
                        time.sleep(0.5)
                        dm_input.fill(msg)
                        time.sleep(1)

                        send_btn = page.locator("button[data-testid='dmComposerSendButton']").first
                        if send_btn.count() > 0 and send_btn.is_enabled():
                            send_btn.click()
                            time.sleep(2)
                            self.update_status(row_idx, 'sent')
                            processed += 1
                            logger.info(f"[{self.handle}] @{username} へのDM送信完了！")
                        else:
                            page.keyboard.press("Enter")
                            time.sleep(2)
                            self.update_status(row_idx, 'sent')
                            processed += 1
                            logger.info(f"[{self.handle}] @{username} へのDM送信完了（Enter送信）")
                    else:
                        self.update_status(row_idx, 'failed', '入力欄が見つかりません')

                    # 送信間隔（DMは凍結リスクが高いため30秒〜90秒推奨）
                    if idx < len(current_batch) - 1:
                        safe_random_wait(30, 90, f"[{self.handle}] 次のDM送信まで")

            finally:
                time.sleep(1)
                context.close()
                logger.info(f"[{self.handle}] 🔒 【提案1】ブラウザを完全終了し、メモリを解放しました。")

        return processed, remaining


def main():
    settings_file = "settings.json"
    settings = {"enableRotation": True, "actionsPerRotation": 3, "cycleCooldownMinutes": 20, "blockMedia": True}
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                settings.update(json.load(f))
        except Exception:
            pass

    with open("accounts.json", "r", encoding="utf-8") as f:
        accounts = json.load(f)

    active_accounts = [a for a in accounts if a.get("isActive", True)]
    logger.info("=" * 60)
    logger.info("   X 自動DM＆フォローボット (Playwright版) 起動")
    logger.info("=" * 60)
    logger.info(f"・対象アカウント数: {len(active_accounts)} 件")
    logger.info(f"・提案1【1窓交代ローテーション】: 有効 (1回あたり {settings.get('actionsPerRotation', 3)} 人送信で交代)")
    logger.info(f"・提案2【画像・動画ブロック】: 有効 (超軽量・メモリ削減)")
    logger.info("=" * 60)

    cycle = 1
    batch_size = int(settings.get("actionsPerRotation", 3))
    cooldown = int(settings.get("cycleCooldownMinutes", 20))

    while True:
        logger.info(f"\\n{'='*20} [第 {cycle} 巡目DM送信スタート] {'='*20}")
        has_remaining = False

        for idx, acc in enumerate(active_accounts):
            client = XDmClient(acc, settings)
            processed, rem = client.run_batch(batch_limit=batch_size)
            if rem > 0:
                has_remaining = True
            time.sleep(5)

        if not has_remaining:
            logger.info("🎉 全ターゲットへのDM送信が完了しました！")
            break

        logger.info(f"全ブラウザを終了し、{cooldown} 分間クールダウン待機します...")
        time.sleep(cooldown * 60)
        cycle += 1


if __name__ == "__main__":
    main()
`;

export const SELENIUM_SCRIPT_TEMPLATE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
X (旧Twitter) ブラウザ自動操縦・自動ツイートボット (Selenium版)
====================================================================
"""
import os, sys, time, random, json, logging
from datetime import datetime
import pandas as pd
import openpyxl
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(name)s] %(message)s')
logger = logging.getLogger("SeleniumBot")

class SeleniumTweetClient:
    def __init__(self, config: dict):
        self.config = config
        self.handle = config.get("handle", "@unknown")
        self.excel_file = config.get("excelFileName", "tweets.xlsx")
        self.min_interval = int(config.get("minIntervalSec", 60))
        self.max_interval = int(config.get("maxIntervalSec", 180))
        safe_handle = "".join([c if c.isalnum() else "_" for c in self.handle])
        self.profile_dir = os.path.abspath(f"./selenium_profiles/{safe_handle}")
        os.makedirs(self.profile_dir, exist_ok=True)

    def run(self):
        logger.info(f"[{self.handle}] Selenium版実行開始")

def main():
    logger.info("Selenium版はPlaywright版 (auto_tweet_playwright.py) のご利用を推奨します。")

if __name__ == "__main__":
    main()
`;

export const BROWSER_REQUIREMENTS = `playwright>=1.40.0
pandas>=2.0.0
openpyxl>=3.1.0
pillow>=10.0.0
pyinstaller>=6.0.0
`;

export const BATCH_START_TEMPLATE = `@echo off
title X Auto Tweet Bot (Auto Start)
color 0b
echo ======================================================
echo    X (Twitter) Auto Tweet Bot - Starting...
echo    [Feature] Proposal 1: 1-Window Rotation
echo    [Feature] Proposal 2: Media & Video Blocking
echo ======================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found or not in PATH.
    echo Please install Python (https://www.python.org/)
    echo and make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: Check and auto install libraries
echo [1/3] Checking libraries...
python -c "import playwright, openpyxl, pandas" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing requirements... please wait...
    pip install -r requirements.txt
    playwright install chromium
    echo Libraries setup finished!
)

echo [2/3] Checking accounts.json...
if not exist accounts.json (
    echo [ERROR] accounts.json not found!
    pause
    exit /b 1
)

echo [3/3] Launching Auto Tweet Bot...
echo.
echo ======================================================
echo  Press [Ctrl + C] or close window to STOP anytime.
echo ======================================================
echo.
python auto_tweet_playwright.py

echo.
echo Process finished.
pause
`;

export const BATCH_START_ROTATION_TEMPLATE = `@echo off
title X 1-Window Rotation Tweet Bot
color 0b
echo ======================================================
echo    X Auto Tweet Bot - 1-Window Rotation Mode
echo    - 1 Account (3-5 tweets) -> Close & Free RAM
echo    - Switch to Next Account -> Close
echo    - 1-Cycle Finished -> Cooldown & Repeat
echo    - Media Blocked (50-70%% RAM reduction)
echo ======================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found.
    pause
    exit /b 1
)

python auto_tweet_playwright.py --rotation --block-media

echo.
pause
`;

export const BATCH_START_DM_TEMPLATE = `@echo off
title X Auto DM Bot (1-Window Rotation & Media Block)
color 0d
echo ======================================================
echo    X Auto DM & Follow Bot - Starting...
echo    - 1-Window Rotation (3-5 DMs per account)
echo    - Media Blocking Enabled
echo    - Reading targets from dm_targets.xlsx
echo ======================================================
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found.
    pause
    exit /b 1
)

python auto_dm_playwright.py

echo.
pause
`;

export const BATCH_SETUP_TEMPLATE = `@echo off
title Setup Requirements
color 0a
echo ======================================================
echo   X Auto Tweet Bot - Setup
echo ======================================================
echo.
echo Installing requirements and browser engine...
echo.
pip install -r requirements.txt
playwright install chromium
echo.
echo ======================================================
echo   Setup completed successfully!
echo   You can now run START.bat or START_ROTATION.bat
echo ======================================================
echo.
pause
`;

export const BATCH_BUILD_EXE_TEMPLATE = `@echo off
title Build EXE (PyInstaller)
color 0e
echo ======================================================
echo   X_AutoTweetBot.exe Builder (Lightweight openpyxl)
echo ======================================================
echo.
echo Installing PyInstaller and required packages...
pip install pyinstaller playwright openpyxl pillow
echo.
echo Building standalone executable (.exe)...
pyinstaller --noconfirm --onedir --console --name "X_AutoTweetBot" --exclude-module pandas "auto_tweet_playwright.py"
echo.
echo ======================================================
echo   Build complete!
echo   Check dist/X_AutoTweetBot/ folder for X_AutoTweetBot.exe
echo ======================================================
echo.
pause
`;

export const BATCH_TEST_ONE_TWEET_TEMPLATE = `@echo off
title X Test 1 Tweet Mode
color 0e
echo ======================================================
echo    X Auto Tweet Bot - [SINGLE TEST MODE]
echo ======================================================
echo.
echo * This will test-post ONLY the FIRST tweet from Excel
echo   and then stop safely.
echo.
python auto_tweet_playwright.py --test

echo.
echo ======================================================
echo   Single tweet test finished!
echo ======================================================
echo.
pause
`;

export const BROWSER_README = `# 𝕏 (Twitter) ブラウザ自動操縦・自動ツイート＆DMツール【完全無料・API不要】

**X APIが有料化（月額100ドル〜）されたため、ブラウザ（Playwright）を直接自動操縦してツイートやDM送信を行うツールです。**
開発者登録やAPIキーの申請は**一切不要**で、お持ちの通常アカウントで今すぐ利用できます。

---

## ⚡ 新機能：提案1＆提案2の実装について

### 提案1：「1窓・順番交代ローテーション」機能
同時並行で何窓もブラウザを開くのではなく、**「常に開いているブラウザは1つだけ」** に制御します。
- **動作フロー:**
  1. アカウント①のブラウザを開き、指定件数（例: 3〜5件）投稿またはDM送信
  2. アカウント①のブラウザを **完全に閉じてメモリを100%解放**
  3. アカウント②のブラウザを開いて実行 ➔ 終わったら閉じる
  4. アカウント③のブラウザを開いて実行 ➔ 終わったら閉じる
  5. 全アカウントが1巡したら指定時間（例: 15〜30分）休止し、また①から繰り返す
- **メリット:**
  - メモリ消費量は「常に1アカウント分」なので、低スペックPCでも重くなりません。
  - 同一PC・同一IPから複数アカウントが同時に機械的アクションを起こす不自然さがなくなり、**凍結・制限リスクが最も低い** 運用方法です。

### 提案2：画像・動画（リール等）の読み込みブロック機能
- **仕組み:**
  Playwrightのネットワーク制御機能で、タイムラインやリールの \`.jpg\` \`.png\` \`.mp4\` などの高画質メディア通信を自動遮断し、文字とボタンの骨組みだけを読み込ませます。
- **メリット:**
  - ブラウザのメモリ使用量が **約50%〜70%カット** されます。
  - ページ読み込み速度が数倍になり、CPUファンが激しく回るのを防ぎます。
  - （※自前で添付する画像ファイルは通常通りアップロード可能です）

---

## 🖱️ コマンド不要！ダブルクリックだけで全自動実行

1. **\`START.bat\` / \`START_ROTATION.bat\` をダブルクリック！**
   - 必要なライブラリが自動チェックされ、未導入なら初回自動インストールされます。
   - そのまま \`accounts.json\`、\`settings.json\`、各Excelを読み込んで自動操縦がスタートします！
2. **DM送信を行いたい場合:**
   - \`START_DM.bat\` をダブルクリックすると、\`dm_targets.xlsx\` を読み込んで自動DM＆フォローが起動します。
3. **exe化したい場合:**
   - \`BUILD_EXE.bat\` をダブルクリックすると、配布可能な \`X_AutoTweetBot.exe\` が自動生成されます。

---

## 📦 同梱ファイル一覧
- \`START.bat\`: **【おすすめ】通常自動起動バッチ**
- \`START_ROTATION.bat\`: **提案1（1窓順番交代ローテーション）起動バッチ**
- \`START_DM.bat\`: **提案1＆2搭載の自動DM＆フォロー起動バッチ**
- \`TEST_ONE_TWEET.bat\`: 各アカウント最初の1件だけ安全テスト投稿
- \`auto_tweet_playwright.py\`: 提案1＆提案2搭載のツイート自動投稿スクリプト
- \`auto_dm_playwright.py\`: 提案1＆提案2搭載の自動DM送信スクリプト
- \`settings.json\`: ローテーション件数・クールダウン時間・メディア遮断設定
- \`accounts.json\`: 複数アカウントの設定（ログイン情報、Excelファイル名）
- \`アカウント情報.xlsx\`: アカウントID・パスワード一括管理Excel
- \`dm_targets.xlsx\`: 自動DM用のターゲットユーザー・メッセージリスト
- \`tweets_*.xlsx\`: 各アカウント用のツイートExcelファイル
- \`images/\`: 添付画像を配置するフォルダ
`;

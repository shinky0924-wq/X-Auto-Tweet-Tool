import { AccountConfig, BotOperationSettings, DmTargetItem } from '../types';
export {
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
} from './browserScriptTemplate';

export const DEFAULT_SETTINGS: BotOperationSettings = {
  enableRotation: true,
  actionsPerRotation: 3,
  cycleCooldownMinutes: 15,
  blockMedia: true,
  blockFonts: false,
};

export const DEFAULT_DM_TARGETS: DmTargetItem[] = [
  {
    id: 1,
    targetUsername: 'sample_user_1',
    messageText: 'はじめまして！投稿を拝見してとても共感しDMさせていただきました。ぜひ繋がっていただけると嬉しいです！✨',
    autoFollow: true,
    status: 'pending',
  },
  {
    id: 2,
    targetUsername: 'sample_user_2',
    messageText: 'こんにちは！普段の発信とても勉強になっております。新企画のモニター様を募集しておりご連絡差し上げました😊',
    autoFollow: true,
    status: 'pending',
  },
  {
    id: 3,
    targetUsername: 'sample_user_3',
    messageText: '突然のDM失礼いたします。ぜひ情報交換させていただけますと幸いです！よろしくお願いいたします。',
    autoFollow: false,
    status: 'pending',
  },
];

export const DEFAULT_ACCOUNTS: AccountConfig[] = [
  {
    id: 'acc-1',
    name: '公式PRアカウント',
    handle: '@brand_official',
    postMethod: 'browser',
    loginId: 'brand_official_login',
    loginPassword: '',
    profileDirName: 'brand_official',
    apiKey: 'YOUR_API_KEY_A',
    apiSecret: 'YOUR_API_SECRET_A',
    accessToken: 'YOUR_ACCESS_TOKEN_A',
    accessSecret: 'YOUR_ACCESS_SECRET_A',
    excelFileName: 'tweets_brand.xlsx',
    minIntervalSec: 60,
    maxIntervalSec: 180,
    repeatMode: false,
    isActive: true,
    tweets: [
      {
        id: 1,
        text: '【新商品入荷のお知らせ】\n本日より春の新作コレクションの販売を開始しました！\n詳細はプロフィールのリンクからご確認ください。\n#新作 #ファッション #Spring2026',
        image_path: 'images/spring_collection.jpg',
        status: 'pending',
      },
      {
        id: 2,
        text: 'こんにちは！今週末は全品ポイント2倍キャンペーンを実施中です。\n気になっていたアイテムをお得にゲットするチャンス！皆様のご来店をお待ちしております。\n#週末セール #お買い得',
        image_path: 'images/weekend_sale.png',
        status: 'pending',
      },
      {
        id: 3,
        text: '本日のおすすめコーディネートのご紹介。\n軽やかなリネンシャツと上品なスラックスの組み合わせです。これからの季節にぴったり！',
        image_path: 'images/coordinate_01.jpg',
        status: 'pending',
      },
      {
        id: 4,
        text: 'いつもたくさんの「いいね」やリツイートありがとうございます！\n質問やリクエストがあればいつでもリプライでお気軽にどうぞ。',
        image_path: '',
        status: 'pending',
      },
    ],
  },
  {
    id: 'acc-2',
    name: 'ライフハック豆知識',
    handle: '@lifehack_tips',
    postMethod: 'browser',
    loginId: 'lifehack_tips_login',
    loginPassword: '',
    profileDirName: 'lifehack_tips',
    apiKey: 'YOUR_API_KEY_B',
    apiSecret: 'YOUR_API_SECRET_B',
    accessToken: 'YOUR_ACCESS_TOKEN_B',
    accessSecret: 'YOUR_ACCESS_SECRET_B',
    excelFileName: 'tweets_tips.xlsx',
    minIntervalSec: 30,
    maxIntervalSec: 90,
    repeatMode: false,
    isActive: true,
    tweets: [
      {
        id: 1,
        text: '💡【PC作業が爆速になるショートカットキー】\n・Win + Shift + S : 範囲指定スクリーンショット\n・Win + V : クリップボード履歴（これ超便利！）\n・Ctrl + Shift + T : 閉じたタブを復活\nぜひ保存して使ってみてください！',
        image_path: 'images/pc_shortcuts.png',
        status: 'pending',
      },
      {
        id: 2,
        text: '朝スッキリ起きるための3つの黄金習慣：\n1. 起きたらまずカーテンを開けて朝日を浴びる\n2. コップ1杯の白湯または水を飲む\n3. 軽いストレッチで血流を促す\n\n今日から試してみてね！☀️',
        image_path: '',
        status: 'pending',
      },
      {
        id: 3,
        text: 'スマホの充電を長持ちさせる小ワザ：\nバッテリー残量は20%〜80%の間を保つのが最も劣化を防げると言われています。就寝中の満充電放置はなるべく避けましょう！🔋',
        image_path: 'images/battery_care.jpg',
        status: 'pending',
      },
    ],
  },
];

export const PYTHON_SCRIPT_TEMPLATE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
X (Twitter) 複数アカウント自動ツイートツール (Multi-Account Auto Tweet Bot)
====================================================================
機能概要:
  1. accounts.json から複数アカウントの設定（APIキー、対象エクセル、間隔秒）を読み込み
  2. アカウントごとに指定されたExcelファイル（.xlsx）を解析
  3. 未投稿（status == 'pending' または空欄）のツイートを抽出
  4. 指定されたファイルパスの画像があればアップロードして添付（v1.1 media_upload）
  5. X API v2 (create_tweet) でツイート投稿を実行
  6. 投稿完了後、Excelファイルの status を 'posted'、posted_at に日時を記録して上書き保存（二重投稿防止）
  7. アカウントごとに設定された最小間隔〜最大間隔秒の範囲でランダムにスリープ待機
====================================================================
"""

import os
import sys
import time
import random
import json
import logging
from datetime import datetime
import pandas as pd
import openpyxl
import tweepy

# ログ出力の設定
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('auto_tweet.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("AutoTweetBot")


class XAccountClient:
    """X アカウントごとのクライアント管理クラス"""
    def __init__(self, config: dict):
        self.config = config
        self.account_id = config.get("id", "unknown")
        self.handle = config.get("handle", "@unknown")
        self.name = config.get("name", "Account")
        self.excel_file = config.get("excelFileName", "tweets.xlsx")
        self.min_interval = config.get("minIntervalSec", 60)
        self.max_interval = config.get("maxIntervalSec", 180)
        self.repeat_mode = config.get("repeatMode", False)

        # 認証初期化
        self.api_key = config.get("apiKey", "")
        self.api_secret = config.get("apiSecret", "")
        self.access_token = config.get("accessToken", "")
        self.access_secret = config.get("accessSecret", "")

        self.client_v2 = None
        self.api_v1 = None
        self._init_tweepy()

    def _init_tweepy(self):
        """tweepyのクライアントとAPI(v1.1画像アップロード用)を初期化"""
        try:
            # X API v2 クライアント（ツイート投稿用）
            self.client_v2 = tweepy.Client(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_secret
            )

            # X API v1.1 認証（画像アップロード用）
            auth = tweepy.OAuth1UserHandler(
                consumer_key=self.api_key,
                consumer_secret=self.api_secret,
                access_token=self.access_token,
                access_token_secret=self.access_secret
            )
            self.api_v1 = tweepy.API(auth)
            logger.info(f"[{self.handle}] API認証クライアントを初期化しました。")
        except Exception as e:
            logger.error(f"[{self.handle}] API認証初期化エラー: {e}")

    def load_tweets(self) -> pd.DataFrame:
        """エクセルファイルからツイートデータを読み込む"""
        if not os.path.exists(self.excel_file):
            logger.error(f"[{self.handle}] 指定されたExcelファイルが見つかりません: {self.excel_file}")
            return pd.DataFrame()

        try:
            df = pd.read_excel(self.excel_file)
            # 必要なカラムの存在チェック
            for col in ['text', 'status']:
                if col not in df.columns:
                    df[col] = ''
            if 'image_path' not in df.columns:
                df['image_path'] = ''
            if 'posted_at' not in df.columns:
                df['posted_at'] = ''

            # NaN を空文字に変換
            df.fillna('', inplace=True)
            return df
        except Exception as e:
            logger.error(f"[{self.handle}] Excel読み込みエラー: {e}")
            return pd.DataFrame()

    def save_tweets(self, df: pd.DataFrame):
        """更新されたツイートデータをエクセルに保存"""
        try:
            df.to_excel(self.excel_file, index=False)
            logger.info(f"[{self.handle}] Excelファイルを更新保存しました: {self.excel_file}")
        except Exception as e:
            logger.error(f"[{self.handle}] Excel保存エラー: {e}")

    def upload_media(self, image_path: str):
        """画像ファイルをアップロードしてmedia_idを取得（カンマ区切りで複数画像対応・最大4枚）"""
        if not image_path or not str(image_path).strip():
            return None

        paths = [p.strip() for p in str(image_path).split(',') if p.strip()]
        media_ids = []

        for p in paths[:4]:  # Xの仕様上最大4枚
            if not os.path.exists(p):
                logger.warning(f"[{self.handle}] 画像ファイルが見つかりません（スキップ）: {p}")
                continue
            try:
                media = self.api_v1.media_upload(filename=p)
                media_ids.append(media.media_id)
                logger.info(f"[{self.handle}] 画像アップロード成功: {p} (media_id: {media.media_id})")
            except Exception as e:
                logger.error(f"[{self.handle}] 画像アップロード失敗: {p} - {e}")

        return media_ids if media_ids else None

    def post_single_tweet(self, text: str, image_path: str = None) -> bool:
        """1件のツイートを投稿"""
        try:
            media_ids = None
            if image_path:
                media_ids = self.upload_media(image_path)

            # ツイート作成
            if media_ids:
                response = self.client_v2.create_tweet(text=text, media_ids=media_ids)
            else:
                response = self.client_v2.create_tweet(text=text)

            tweet_id = response.data['id']
            logger.info(f"[{self.handle}] ツイート投稿成功！ (Tweet ID: {tweet_id})")
            return True
        except tweepy.errors.Forbidden as e:
            logger.error(f"[{self.handle}] 権限エラー(403): X Developer PortalでAppの権限が「Read and Write」になっているか、認証トークンを再生成したか確認してください。詳細: {e}")
            return False
        except tweepy.errors.TooManyRequests as e:
            logger.warning(f"[{self.handle}] レート制限(429): しばらく待機してください。詳細: {e}")
            return False
        except Exception as e:
            logger.error(f"[{self.handle}] ツイート投稿失敗: {e}")
            return False

    def run_cycle(self):
        """アカウントの未投稿ツイートを1件または全件順次実行"""
        logger.info(f"========== [{self.handle} ({self.name})] 実行開始 ==========")
        df = self.load_tweets()
        if df.empty:
            logger.warning(f"[{self.handle}] ツイートデータがありません。")
            return

        # 未投稿の行を検索 (status が pending または空文字)
        pending_mask = df['status'].astype(str).str.lower().isin(['pending', '未投稿', ''])
        pending_indices = df[pending_mask].index.tolist()

        if not pending_indices:
            logger.info(f"[{self.handle}] 未投稿のツイートはありません。全件投稿済みです。")
            if self.repeat_mode:
                logger.info(f"[{self.handle}] リピートモードが有効なため、ステータスをリセットします。")
                df['status'] = 'pending'
                self.save_tweets(df)
            return

        logger.info(f"[{self.handle}] 未投稿ツイート数: {len(pending_indices)}件")

        for count, idx in enumerate(pending_indices, 1):
            tweet_text = str(df.at[idx, 'text']).strip()
            img_path = str(df.at[idx, 'image_path']).strip()

            if not tweet_text:
                logger.warning(f"[{self.handle}] 行 {idx+2}: 本文が空のためスキップします。")
                df.at[idx, 'status'] = 'skipped'
                self.save_tweets(df)
                continue

            logger.info(f"[{self.handle}] 投稿実行中 ({count}/{len(pending_indices)})...")
            logger.info(f"本文抜粋: {tweet_text[:40]}...")
            if img_path:
                logger.info(f"添付画像: {img_path}")

            # 投稿実行
            success = self.post_single_tweet(tweet_text, img_path)

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if success:
                df.at[idx, 'status'] = 'posted'
                df.at[idx, 'posted_at'] = now_str
            else:
                df.at[idx, 'status'] = 'failed'
                df.at[idx, 'posted_at'] = f"Error at {now_str}"

            # エクセルを即座に更新保存（途中で停止しても二重投稿にならないよう安全保存）
            self.save_tweets(df)

            # 最後のツイートでなければ間隔を空けてスリープ
            if count < len(pending_indices):
                interval = random.randint(self.min_interval, self.max_interval)
                logger.info(f"[{self.handle}] 次のツイートまで {interval} 秒待機します（設定範囲: {self.min_interval}〜{self.max_interval}秒）...")
                time.sleep(interval)

        logger.info(f"========== [{self.handle}] 本日の自動ツイートが完了しました ==========")


def main():
    """メイン実行エントリポイント"""
    config_file = "accounts.json"
    if not os.path.exists(config_file):
        logger.error(f"設定ファイル '{config_file}' が見つかりません。")
        sys.exit(1)

    with open(config_file, "r", encoding="utf-8") as f:
        accounts = json.load(f)

    logger.info(f"合計 {len(accounts)} 個のアカウント設定を読み込みました。")

    for acc_config in accounts:
        if not acc_config.get("isActive", True):
            logger.info(f"[{acc_config.get('handle')}] isActive=False のためスキップします。")
            continue

        client = XAccountClient(acc_config)
        client.run_cycle()

    logger.info("すべてのアカウントの自動ツイート処理が終了しました。")


if __name__ == "__main__":
    main()
`;

export const PYTHON_REQUIREMENTS = `tweepy>=4.14.0
pandas>=2.0.0
openpyxl>=3.1.0
pillow>=10.0.0
`;

export const PYTHON_README = `# X (Twitter) 複数アカウント自動ツイートツール

PythonとExcelを使って、複数アカウントでの自動ツイート（画像添付・ランダム待機間隔）を実行するツールです。

## 📁 ファイル構成
- \`auto_tweet_bot.py\`: 自動ツイート実行メインスクリプト
- \`accounts.json\`: アカウントごとのAPIキー・エクセルファイル名・間隔秒の設定
- \`tweets_*.xlsx\`: 各アカウント用のツイートリストエクセル
- \`images/\`: 添付画像を配置するフォルダ
- \`requirements.txt\`: 必要なPythonライブラリ

---

## 🚀 使い方・環境構築手順

### 1. Python環境の準備
Python 3.8以上がインストールされていることを確認してください。
ターミナルまたはコマンドプロンプトで以下を実行してライブラリをインストールします。

\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 2. X Developer Portal でAPIキーの取得
1. [X Developer Portal](https://developer.x.com/) にログイン
2. プロジェクトとAppを作成
3. **重要（よくある落とし穴）**:
   - **User authentication settings** を編集
   - App permissions を **「Read and Write」** に変更して保存
   - その後、**「Keys and Tokens」** タブから **Access Token & Secret** を再生成（Generate/Regenerate）してください。
     ※権限を「Read and Write」に変更する前に生成したトークンは書き込み権限がないため403エラーになります。
4. 取得した4つのキーを \`accounts.json\` に設定します：
   - API Key (Consumer Key)
   - API Key Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

### 3. Excelファイルの準備
各アカウントのExcelファイルを開き、投稿したい内容を入力します。
| id | text | image_path | status | posted_at |
|---|---|---|---|---|
| 1 | こんにちは！今日の投稿です。 | images/photo1.jpg | pending | (空欄) |
| 2 | 画像なしの投稿テスト | (空欄) | pending | (空欄) |

- \`text\`: ツイート本文（改行もそのままOK）
- \`image_path\`: 画像の相対パスまたは絶対パス（カンマ区切りで最大4枚まで指定可能）
- \`status\`: \`pending\` または空欄なら投稿対象になります。投稿が成功すると自動的に \`posted\` に書き換わります。

### 4. ツールの実行
\`\`\`bash
python auto_tweet_bot.py
\`\`\`

実行すると、アカウントごとのExcelを順次読み込み、指定した秒数（例: 60秒〜180秒のランダム）待機しながら自動投稿が行われます！
`;

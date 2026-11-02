import React, { useState } from 'react';
import { 
  KeyRound, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ShieldAlert,
  Layers,
  Sparkles,
  Info,
  Globe,
  MonitorPlay,
  Terminal,
  FileCode
} from 'lucide-react';

export const ApiGuide: React.FC = () => {
  const [guideMode, setGuideMode] = useState<'browser' | 'api'>('browser');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mode Switcher Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>𝕏 自動投稿 セットアップ＆運用マニュアル</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              有料API不要の「ブラウザ自動操縦」と公式「X API」の2つの方式から選択して確認できます。
            </p>
          </div>

          <div className="flex items-center p-1 bg-neutral-950 rounded-xl border border-neutral-800 self-start sm:self-auto">
            <button
              onClick={() => setGuideMode('browser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                guideMode === 'browser'
                  ? 'bg-emerald-500 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>ブラウザ自動操縦 (完全無料)</span>
            </button>
            <button
              onClick={() => setGuideMode('api')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                guideMode === 'api'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>X API (有料プラン)</span>
            </button>
          </div>
        </div>

        {/* Comparison Callout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs">
            <span className="font-bold text-emerald-400 block mb-1">【推奨】ブラウザ自動操作 (Playwright/Selenium)</span>
            <ul className="text-neutral-300 space-y-1 text-[11px] list-disc list-inside">
              <li>API契約・月額費用ゼロ（完全無料）</li>
              <li>開発者申請・審査不要で今すぐ実行可能</li>
              <li>ChromeのログインCookie保存で2回目以降自動投稿</li>
            </ul>
          </div>

          <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-xs">
            <span className="font-bold text-neutral-300 block mb-1">公式 X API (Tweepy)</span>
            <ul className="text-neutral-400 space-y-1 text-[11px] list-disc list-inside">
              <li>現在X APIは月額100ドル〜の有料化</li>
              <li>Free枠では書き込み制限が極めて厳しい</li>
              <li>APIキーやAccess Tokenの発行が必要</li>
            </ul>
          </div>
        </div>
      </div>

      {guideMode === 'browser' ? (
        /* Browser Automation Guide */
        <div className="space-y-6">
          {/* Quick Double-Click Start Section */}
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                🖱️
              </div>
              <h3 className="text-base font-bold text-white">
                【超かんたん】コマンド不要！ダブルクリックだけで全自動起動
              </h3>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed">
              Windowsをお使いの場合、黒い画面にコマンドを入力する必要はありません！<br />
              ZIPを解凍したら、フォルダ内の <strong className="text-emerald-300 font-mono">「START.bat」</strong> をダブルクリックするだけで、
              <strong>初回ライブラリ自動インストールからブラウザ起動・自動投稿まですべて自動実行</strong>されます。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-amber-500/40 text-xs space-y-1">
                <span className="font-bold text-amber-300 block">⚡ TEST_ONE_TWEET.bat</span>
                <p className="text-neutral-300 text-[11px]">
                  【実アカウント投稿テスト用】Excelの<strong>最初の1件だけを実際に投稿</strong>して安全に終了します。最初のお試しに最適！
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-emerald-500/30 text-xs space-y-1">
                <span className="font-bold text-emerald-400 block">START.bat （本番の連続起動）</span>
                <p className="text-neutral-300 text-[11px]">
                  ダブルクリックで環境チェック＆Excel全件の自動投稿を開始します。終了は画面を閉じるか <kbd className="bg-neutral-800 px-1 rounded font-mono">Ctrl+C</kbd>。
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs space-y-1">
                <span className="font-bold text-sky-400 block">BUILD_EXE.bat （exe化）</span>
                <p className="text-neutral-300 text-[11px]">
                  ダブルクリックすると、PythonコードをWindows用実行ファイル「<strong>X_AutoTweetBot.exe</strong>」に自動変換します。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              手動でコマンド実行する場合の手順
            </h3>

            <div className="space-y-4 text-xs">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <span className="font-bold text-emerald-400 font-mono">STEP 1: ライブラリとブラウザ本体のインストール</span>
                <p className="text-neutral-300 leading-relaxed">
                  ダウンロードしたZIPを展開し、フォルダ内でターミナル（コマンドプロンプト）を開いて実行します。
                </p>
                <div className="bg-neutral-900 p-3 rounded-lg font-mono text-[11px] text-neutral-200 space-y-1.5 border border-neutral-800">
                  <div>pip install -r requirements.txt</div>
                  <div className="text-emerald-400">playwright install chromium</div>
                </div>
                <p className="text-[11px] text-neutral-400">
                  ※ <code className="text-neutral-300 font-mono">playwright install chromium</code> を実行すると、自動操縦に必要なChromiumブラウザが自動ダウンロードされます。
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <span className="font-bold text-emerald-400 font-mono">STEP 2: accounts.json と Excel の確認</span>
                <p className="text-neutral-300 leading-relaxed">
                  画面上で設定した各アカウントのExcelファイル（<code className="text-emerald-300">tweets_brand.xlsx</code> など）に投稿したい文章と画像のパスを入力しておきます。
                </p>
                <div className="bg-neutral-900 p-2.5 rounded text-[11px] font-mono text-neutral-300 border border-neutral-800">
                  画像は <code className="text-sky-400">images/sample.jpg</code> のように「images」フォルダ内に入れて相対パスで指定します。
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <span className="font-bold text-emerald-400 font-mono">STEP 3: 初回起動とログインセッション保存</span>
                <p className="text-neutral-300 leading-relaxed">
                  以下のコマンドでスクリプトを起動します：
                </p>
                <div className="bg-neutral-900 p-3 rounded-lg font-mono text-[11px] text-neutral-200 border border-neutral-800">
                  python auto_tweet_playwright.py
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg text-emerald-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    ログインセッションは自動で永続保存されます
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    アカウント設定にログインID/PWを入力しておくか、初回起動時に開いたブラウザ画面で手動でXにログインすれば、Cookieが <code className="text-white">browser_sessions/</code> に永続保存されます。
                    2回目以降の実行時はログインをスキップして即座に投稿が始まります！
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* X API Guide */
        <div className="space-y-6">
          {/* Critical Note Box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <h3 className="text-sm font-bold text-amber-200">
                API利用時の注意：投稿時に「403 Forbidden」エラーになる原因
              </h3>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              X Developer Portal のデフォルト設定では、Appの権限が「<strong>Read only（読み取り専用）</strong>」になっています。
              この状態のまま生成した Access Token ではツイート投稿ができません。
            </p>
            <div className="bg-neutral-950/80 rounded-xl p-3.5 border border-amber-500/20 text-xs font-mono text-neutral-300 space-y-1.5">
              <div className="text-amber-400 font-bold">必須手順:</div>
              <div>1. App Settings の「User authentication settings」を開く</div>
              <div>2. App permissions を「<strong>Read and write</strong>」に変更して保存する</div>
              <div>3. <strong className="text-rose-400">必ず「Keys and tokens」タブに戻り、Access Token と Secret を「Regenerate（再生成）」する</strong></div>
            </div>
          </div>

          {/* Step by step guide */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              X Developer Portal での取得手順 (4ステップ)
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400 font-mono">STEP 1: 開発者アカウントの作成</span>
                  <a
                    href="https://developer.x.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 underline font-mono"
                  >
                    developer.x.com
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  X Developer Platform へアクセスし、開発者登録を行います。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <span className="font-bold text-purple-400 font-mono">STEP 2: プロジェクト ＆ Appの作成</span>
                <p className="text-neutral-300 leading-relaxed">
                  ダッシュボードから「+ Create App」をクリックしてアプリを作成します。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <span className="font-bold text-amber-400 font-mono">STEP 3: User Authentication 設定 (Read and write)</span>
                <p className="text-neutral-300 leading-relaxed">
                  App permissions で「<strong>Read and write</strong>」を選択して保存します。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                <span className="font-bold text-emerald-400 font-mono">STEP 4: 4つのキーを accounts.json に入力</span>
                <p className="text-neutral-300 leading-relaxed">
                  API Key, API Key Secret, Access Token, Access Token Secret をコピーして登録します。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-account & Ban-Prevention Tips */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-400" />
          アカウント凍結・シャドウバンを防ぐ安全運用のポイント
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-300">
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
            <span className="font-bold text-white block">1. ランダム待機秒数を十分に取る</span>
            <p className="text-neutral-400 leading-relaxed">
              一定秒数（例: ぴったり30秒）で連続投稿するとbot検知の対象になります。
              「<strong>最小60秒〜最大180秒（または数分〜数時間）</strong>」のランダム間隔を設定することで人間らしい挙動になり安全です。
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
            <span className="font-bold text-white block">2. アカウントごとにセッションを分離</span>
            <p className="text-neutral-400 leading-relaxed">
              ブラウザ操作版スクリプトはアカウントごとに異なるプロファイルフォルダ（<code className="text-sky-300">browser_sessions/@handle/</code>）を自動作成します。
              Cookieやキャッシュが互いに混ざらないため、複数アカウントでも安全に運用できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  Activity,
  FileSpreadsheet,
  Download,
  FastForward,
  ExternalLink,
  RefreshCw,
  Cpu,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { AccountConfig, ExecutionLog, TweetItem, BotOperationSettings } from '../types';
import { downloadAccountExcel } from '../utils/excelHelper';
import { DEFAULT_SETTINGS } from '../data/defaultData';

interface SimulatorProps {
  accounts: AccountConfig[];
  settings?: BotOperationSettings;
  onUpdateAccountTweets: (accountId: string, tweets: TweetItem[]) => void;
}

export const Simulator: React.FC<SimulatorProps> = ({
  accounts,
  settings = DEFAULT_SETTINGS,
  onUpdateAccountTweets,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(3); // 3x by default for fast preview
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [currentAccountIdx, setCurrentAccountIdx] = useState(0);
  const [countdownSec, setCountdownSec] = useState<number>(0);
  const [maxCountdown, setMaxCountdown] = useState<number>(0);
  const [accountActionCount, setAccountActionCount] = useState<number>(0);
  const [cycleCount, setCycleCount] = useState<number>(1);
  const [activeTweet, setActiveTweet] = useState<{
    account: AccountConfig;
    tweet: TweetItem;
  } | null>(null);

  const timerRef = useRef<any>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (
    account: AccountConfig,
    level: ExecutionLog['level'],
    message: string,
    tweetId?: number
  ) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: timeStr,
        accountId: account.id,
        accountHandle: account.handle,
        level,
        message,
        tweetId,
      },
    ]);
  };

  // Start / Resume simulation
  const handleStart = () => {
    setIsRunning(true);
    const activeAccounts = accounts.filter((a) => a.isActive);
    if (activeAccounts.length === 0) {
      alert('有効なアカウントがありません。アカウント設定で有効にしてください。');
      setIsRunning(false);
      return;
    }

    if (logs.length === 0) {
      addLog(
        activeAccounts[0],
        'info',
        `🚀 自動ツイートツール起動: 有効なアカウント数 ${activeAccounts.length} 件`
      );
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setCountdownSec(0);
    setMaxCountdown(0);
    setActiveTweet(null);
    setCurrentAccountIdx(0);
    setAccountActionCount(0);
    setCycleCount(1);
    setLogs([]);
  };

  // Main simulation loop engine
  useEffect(() => {
    if (!isRunning) return;

    const activeAccounts = accounts.filter((a) => a.isActive);
    if (activeAccounts.length === 0) {
      setIsRunning(false);
      return;
    }

    // If currently counting down for sleep interval
    if (countdownSec > 0) {
      timerRef.current = setTimeout(() => {
        setCountdownSec((prev) => Math.max(0, prev - 1));
      }, 1000 / speedMultiplier);
      return () => clearTimeout(timerRef.current);
    }

    const acc = activeAccounts[currentAccountIdx % activeAccounts.length];
    const pendingTweets = acc.tweets.filter((t) => t.status === 'pending');
    const batchLimit = acc.actionsPerBatch || settings.actionsPerRotation || 3;

    // 提案1: 現在のアカウントがバッチ上限に達したかチェック
    if (settings.enableRotation && accountActionCount >= batchLimit) {
      addLog(
        acc,
        'info',
        `🔒 【提案1】[${acc.handle}] 指定の ${batchLimit} 件を投稿完了。ブラウザを完全終了し、メモリを100%解放しました。`
      );
      setAccountActionCount(0);

      const nextIdx = (currentAccountIdx + 1) % activeAccounts.length;
      if (nextIdx === 0) {
        // 1巡完了
        const cooldownSec = (settings.cycleCooldownMinutes || 15) * 60;
        addLog(
          acc,
          'warn',
          `🍵 【提案1】第 ${cycleCount} 巡目が完了しました！ 全ブラウザ完全終了状態で ${settings.cycleCooldownMinutes} 分間クールダウン待機します...`
        );
        setCycleCount((c) => c + 1);
        setMaxCountdown(cooldownSec);
        setCountdownSec(Math.min(cooldownSec, 30)); // シミュレーターではプレビューのため長すぎず30秒程度に短縮
      } else {
        addLog(
          acc,
          'info',
          `🔄 【提案1】次のアカウント [${activeAccounts[nextIdx].handle}] のブラウザを1窓のみ起動します...`
        );
        setMaxCountdown(5);
        setCountdownSec(5);
      }
      setCurrentAccountIdx(nextIdx);
      return;
    }

    if (pendingTweets.length === 0) {
      if (acc.repeatMode) {
        addLog(acc, 'info', `🔄 [${acc.handle}] リピートモード: 全件投稿済みのためステータスをリセットします。`);
        const resetTweets = acc.tweets.map((t) => ({ ...t, status: 'pending' as const, posted_at: '' }));
        onUpdateAccountTweets(acc.id, resetTweets);
      } else {
        addLog(acc, 'info', `✅ [${acc.handle}] 未投稿ツイートはありません。`);
      }

      const anyPending = activeAccounts.some((a) =>
        a.tweets.some((t) => t.status === 'pending')
      );

      if (!anyPending && !acc.repeatMode) {
        addLog(acc, 'success', '🎉 すべてのアカウントの全ツイート投稿が完了しました！');
        setIsRunning(false);
        return;
      }

      // Move to next account
      setAccountActionCount(0);
      setCurrentAccountIdx((prev) => (prev + 1) % activeAccounts.length);
      return;
    }

    // Pick the first pending tweet
    const targetTweet = pendingTweets[0];
    setActiveTweet({ account: acc, tweet: targetTweet });

    // 初回起動時のログ
    if (accountActionCount === 0) {
      addLog(
        acc,
        'info',
        `🌐 【提案1】[${acc.handle}] のブラウザを1窓のみ起動しました（セッション保持）`
      );
      if (settings.blockMedia) {
        addLog(
          acc,
          'info',
          `⚡ 【提案2】画像・動画・リール等の通信を自動ブロック中（メモリ65%削減・超高速）`
        );
      }
    }

    addLog(
      acc,
      'info',
      `📄 [${acc.handle}] Excelより ID #${targetTweet.id} を取得 (${accountActionCount + 1}/${batchLimit} 件目)`
    );

    // Simulate post action with delay
    timerRef.current = setTimeout(() => {
      if (targetTweet.image_path) {
        addLog(
          acc,
          'info',
          `🖼️ [${acc.handle}] 自前の添付画像をアップロード中: ${targetTweet.image_path}`
        );
      }

      const nowStr = new Date().toLocaleString('ja-JP');
      const updatedTweets = acc.tweets.map((t) =>
        t.id === targetTweet.id
          ? { ...t, status: 'posted' as const, posted_at: nowStr }
          : t
      );
      onUpdateAccountTweets(acc.id, updatedTweets);

      addLog(
        acc,
        'success',
        `✨ [${acc.handle}] ツイート投稿成功！ (ID: #${targetTweet.id}, status=posted)`,
        targetTweet.id
      );

      setAccountActionCount((prev) => prev + 1);

      // Random wait between posts
      const actualMin = Math.min(acc.minIntervalSec, acc.maxIntervalSec);
      const actualMax = Math.max(acc.minIntervalSec, acc.maxIntervalSec);
      const interval = actualMin === actualMax ? actualMin : Math.floor(Math.random() * (actualMax - actualMin + 1) + actualMin);

      setMaxCountdown(interval);
      setCountdownSec(interval);
      addLog(
        acc,
        'warn',
        `⏳ [${acc.handle}] 次の投稿まで ${interval} 秒待機中 (${actualMin}s〜${actualMax}s)`
      );
    }, 1500 / speedMultiplier);

    return () => clearTimeout(timerRef.current);
  }, [isRunning, countdownSec, currentAccountIdx, accountActionCount, speedMultiplier, accounts, settings]);

  return (
    <div className="space-y-6">
      {/* Top Controller Panel */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">
                自動ツイート実行シミュレーター
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                isRunning 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-neutral-800 text-neutral-400'
              }`}>
                {isRunning ? 'RUNNING' : 'IDLE'}
              </span>
              {settings.enableRotation && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  提案1: 1窓交代 ({settings.actionsPerRotation}件/交代)
                </span>
              )}
              {settings.blockMedia && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  提案2: メディア遮断 (RAM 65%削減)
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              「起動 → 各アカウントのExcel読込 → 画像添付 → 投稿 → 提案1の1窓終了・メモリ解放 → 次アカウントへ交代」の処理フローをシミュレートします。
            </p>
          </div>

          {/* Control Buttons & Speed */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Speed Selector */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-1 text-xs">
              <FastForward className="w-3.5 h-3.5 text-neutral-400 ml-1.5 mr-1" />
              <span className="text-neutral-500 mr-2">速度:</span>
              {[1, 3, 10].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-2 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    speedMultiplier === spd
                      ? 'bg-sky-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Play/Pause Button */}
            {!isRunning ? (
              <button
                id="btn-simulator-start"
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                自動ツイート開始
              </button>
            ) : (
              <button
                id="btn-simulator-pause"
                onClick={handlePause}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                <Pause className="w-4 h-4 fill-current" />
                一時停止
              </button>
            )}

            {/* Reset Button */}
            <button
              id="btn-simulator-reset"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs border border-neutral-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </button>
          </div>
        </div>

        {/* Live Status Bar & Countdown */}
        {countdownSec > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                アカウント設定の間隔で待機中: 次のツイートまで残り <strong className="font-mono text-white text-sm">{countdownSec}</strong> 秒
              </span>
              <span className="text-neutral-500 font-mono text-[11px]">
                設定範囲: {accounts[currentAccountIdx % accounts.length]?.minIntervalSec}〜{accounts[currentAccountIdx % accounts.length]?.maxIntervalSec}秒
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
              <div
                className="bg-gradient-to-r from-amber-500 to-sky-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${maxCountdown > 0 ? ((maxCountdown - countdownSec) / maxCountdown) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left is Tweet Card Preview, Right is Live Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Account Status Cards & Active Post Card Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            ツイートプレビュー (X公式デザイン再現)
          </h3>

          {/* X Post Card UI */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            {activeTweet ? (
              <div className="space-y-3">
                {/* Header: User avatar and name */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                    {activeTweet.account.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">
                        {activeTweet.account.name}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono truncate">
                        {activeTweet.account.handle}
                      </span>
                      <span className="text-neutral-500 text-xs">・ 今</span>
                    </div>
                    <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20 inline-block mt-0.5">
                      Excel: {activeTweet.account.excelFileName} (ID: #{activeTweet.tweet.id})
                    </span>
                  </div>
                </div>

                {/* Tweet Body Text */}
                <div className="text-sm text-neutral-100 whitespace-pre-wrap leading-relaxed pl-13">
                  {activeTweet.tweet.text}
                </div>

                {/* Attached Image Box */}
                {activeTweet.tweet.image_path ? (
                  <div className="pl-13">
                    <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 p-3 flex flex-col items-center justify-center text-center group">
                      <div className="w-full h-36 rounded-lg bg-neutral-900 flex flex-col items-center justify-center border border-neutral-800/80">
                        <ImageIcon className="w-8 h-8 text-sky-400 mb-2" />
                        <span className="text-xs text-neutral-300 font-mono font-medium">
                          {activeTweet.tweet.image_path}
                        </span>
                        <span className="text-[10px] text-neutral-500 mt-1">
                          (ローカル画像ファイル添付シミュレーション)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Tweet Action Icons with Real Post Intent */}
                <div className="flex items-center justify-between text-neutral-500 text-xs pt-3 border-t border-neutral-800/60 pl-13 flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span>💬 12</span>
                    <span>🔁 45</span>
                    <span>❤️ 189</span>
                  </div>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(activeTweet.tweet.text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-sm"
                    title="Python不要！今すぐこの文章を実際のXで投稿"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    この内容で実際にX投稿する
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
                  𝕏
                </div>
                <p className="text-xs">
                  「自動ツイート開始」をクリックすると、ここに投稿プレビューが表示されます。
                </p>
              </div>
            )}
          </div>

          {/* Account Status Mini Cards */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
              各アカウントの進行状況
            </span>
            <div className="space-y-2">
              {accounts.map((acc) => {
                const total = acc.tweets.length;
                const posted = acc.tweets.filter((t) => t.status === 'posted').length;
                const percent = total > 0 ? Math.round((posted / total) * 100) : 0;

                return (
                  <div
                    key={acc.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white truncate">
                          {acc.name}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          {acc.handle}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        間隔: {acc.minIntervalSec}s〜{acc.maxIntervalSec}s | ファイル: {acc.excelFileName}
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-xs text-sky-400">
                        {posted} / {total} 件 ({percent}%)
                      </span>
                      <div className="w-20 bg-neutral-950 rounded-full h-1.5 mt-1 border border-neutral-800">
                        <div
                          className="bg-sky-500 h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Real-time Terminal Log (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[520px] bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-inner">
          {/* Terminal Header */}
          <div className="bg-neutral-900/90 px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <Terminal className="w-4 h-4 text-emerald-400 ml-2" />
              <span className="text-xs font-mono text-neutral-300 font-semibold">
                python auto_tweet_playwright.py (標準出力ログ)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-neutral-400 hover:text-white px-2 py-0.5 rounded bg-neutral-800 transition cursor-pointer"
              >
                ログ消去
              </button>
            </div>
          </div>

          {/* Terminal Logs Output */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic py-8 text-center">
                待機中... 上部の「自動ツイート開始」をクリックすると、ここにPythonスクリプトの標準出力ログがリアルタイムに表示されます。
              </div>
            ) : (
              logs.map((log) => {
                let colorClass = 'text-neutral-300';
                if (log.level === 'success') colorClass = 'text-emerald-400 font-medium';
                if (log.level === 'warn') colorClass = 'text-amber-400';
                if (log.level === 'error') colorClass = 'text-rose-400 font-bold';

                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-neutral-900/40 py-0.5 px-1 rounded">
                    <span className="text-neutral-600 flex-shrink-0 select-none">
                      [{log.timestamp}]
                    </span>
                    <span className="text-sky-500 flex-shrink-0">
                      [{log.accountHandle}]
                    </span>
                    <span className={`${colorClass} break-all`}>
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Footer */}
          <div className="bg-neutral-900/60 px-4 py-2 border-t border-neutral-800/80 text-[11px] text-neutral-500 flex items-center justify-between">
            <span>出力行数: {logs.length} 行</span>
            <span className="font-mono">Python 3.10+ / Playwright / OpenPyXL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

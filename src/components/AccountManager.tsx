import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Key, 
  Clock, 
  FileSpreadsheet, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Check, 
  Shuffle,
  AlertTriangle,
  Globe,
  MonitorPlay,
  Sparkles,
  Lock,
  Download,
  Upload,
  RefreshCw,
  Zap,
  Sliders,
  Layers,
  Cpu
} from 'lucide-react';
import { AccountConfig, BotOperationSettings } from '../types';
import { 
  downloadAccountsInfoExcel, 
  parseAccountsInfoExcel, 
  downloadAccountMultiTabExcel 
} from '../utils/excelHelper';
import { DEFAULT_SETTINGS } from '../data/defaultData';

interface AccountManagerProps {
  accounts: AccountConfig[];
  selectedAccountId: string;
  settings?: BotOperationSettings;
  onUpdateSettings?: (settings: BotOperationSettings) => void;
  onSelectAccount: (id: string) => void;
  onUpdateAccount: (updated: AccountConfig) => void;
  onAddAccount: () => void;
  onDeleteAccount: (id: string) => void;
  onNavigateToSimulator?: () => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  selectedAccountId,
  settings = DEFAULT_SETTINGS,
  onUpdateSettings,
  onSelectAccount,
  onUpdateAccount,
  onAddAccount,
  onDeleteAccount,
  onNavigateToSimulator,
}) => {
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const accountInfoFileRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadAccountsInfo = () => {
    downloadAccountsInfoExcel(accounts, 'アカウント情報.xlsx');
  };

  const handleUploadAccountsInfo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseAccountsInfoExcel(file);
      if (parsed.length === 0) {
        alert('有効なアカウント情報（アカウントID/アカウントpw）が見つかりませんでした。');
        return;
      }
      let updateCount = 0;
      for (const item of parsed) {
        const existing = accounts.find(
          (a) => a.loginId === item.loginId || a.handle === item.loginId || a.name === item.name
        );
        if (existing) {
          onUpdateAccount({
            ...existing,
            loginId: item.loginId || existing.loginId,
            loginPassword: item.loginPassword !== undefined ? item.loginPassword : existing.loginPassword,
            authToken: item.authToken || existing.authToken,
          });
          updateCount++;
        }
      }
      alert(`「${file.name}」から ${parsed.length} 件のアカウント情報を読み込みました！（${updateCount} 件を更新）`);
    } catch (err: any) {
      alert(`アカウント情報の読み込みに失敗しました: ${err.message}`);
    }
    if (accountInfoFileRef.current) accountInfoFileRef.current.value = '';
  };

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const postMethod = currentAccount?.postMethod || 'browser';

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (field: keyof AccountConfig, value: any) => {
    if (!currentAccount) return;
    onUpdateAccount({
      ...currentAccount,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* 提案1 & 提案2: 複数アカウント高速・省エネ運用設定パネル */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-sky-950/40 border border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                複数アカウント高速・省エネ設定
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-medium">
                  提案1＆提案2 実装済み
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                低スペックPCでもクラッシュせず、アカウント凍結・制限リスクを最小限に抑えて運用できます。
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 提案1: 1窓・順番交代ローテーション */}
          <div className={`p-4 rounded-xl border transition ${
            settings.enableRotation 
              ? 'bg-neutral-950/70 border-sky-500/40 shadow-sm' 
              : 'bg-neutral-950/30 border-neutral-800 opacity-70'
          }`}>
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${settings.enableRotation ? 'text-sky-400' : 'text-neutral-500'}`} />
                <span className="text-xs font-bold text-white">
                  提案1: 1窓・順番交代ローテーション
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings?.({ ...settings, enableRotation: !settings.enableRotation })}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enableRotation ? 'bg-sky-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    settings.enableRotation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-neutral-300 mb-3 leading-relaxed">
              常時開くブラウザは<strong className="text-sky-300">「1つだけ」</strong>。指定件数を投稿したらブラウザを<strong className="text-sky-300">完全終了してメモリ解放</strong>し、次のアカウントへ交代。1巡後に休憩して繰り返します。
            </p>

            {settings.enableRotation && (
              <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1.5">
                    <span>1アカウントごとの投稿件数:</span>
                    <span className="font-mono text-sky-400 font-bold">
                      {settings.actionsPerRotation} 件 / アカウント
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => onUpdateSettings?.({ ...settings, actionsPerRotation: num })}
                        className={`px-2.5 py-1 text-xs rounded-lg font-mono transition cursor-pointer ${
                          settings.actionsPerRotation === num
                            ? 'bg-sky-500 text-neutral-950 font-bold shadow-sm'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {num}件
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-neutral-400">自由指定:</span>
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={settings.actionsPerRotation}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          onUpdateSettings?.({ ...settings, actionsPerRotation: val });
                        }}
                        className="w-16 px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-center text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-300 mb-1.5">
                    <span>1巡完了後のクールダウン休止:</span>
                    <span className="font-mono text-sky-400 font-bold">
                      {settings.cycleCooldownMinutes} 分間待機
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[5, 15, 30, 60].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => onUpdateSettings?.({ ...settings, cycleCooldownMinutes: min })}
                        className={`px-2.5 py-1 text-xs rounded-lg font-mono transition cursor-pointer ${
                          settings.cycleCooldownMinutes === min
                            ? 'bg-sky-500 text-neutral-950 font-bold shadow-sm'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        {min}分
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-neutral-400">自由指定:</span>
                      <input
                        type="number"
                        min="0"
                        max="1440"
                        value={settings.cycleCooldownMinutes}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          onUpdateSettings?.({ ...settings, cycleCooldownMinutes: val });
                        }}
                        className="w-16 px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono text-center text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 提案2: 画像・動画（リール等）の読み込みブロック機能 */}
          <div className={`p-4 rounded-xl border transition ${
            settings.blockMedia 
              ? 'bg-neutral-950/70 border-emerald-500/40 shadow-sm' 
              : 'bg-neutral-950/30 border-neutral-800 opacity-70'
          }`}>
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <Cpu className={`w-4 h-4 ${settings.blockMedia ? 'text-emerald-400' : 'text-neutral-500'}`} />
                <span className="text-xs font-bold text-white">
                  提案2: 画像・動画（リール等）の読み込みブロック
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings?.({ ...settings, blockMedia: !settings.blockMedia })}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.blockMedia ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    settings.blockMedia ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-neutral-300 mb-3 leading-relaxed">
              タイムラインやリールの高画質画像・動画通信を自動遮断し、<strong className="text-emerald-300">文字とボタンの骨組みだけを読み込み</strong>ます。自前の添付画像は通常通りアップロード可能です。
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 text-center">
              <div className="bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">メモリ使用量</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">50〜70% 削減</span>
              </div>
              <div className="bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">読込速度</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">約 3倍 高速</span>
              </div>
              <div className="bg-neutral-900/90 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">CPUファン</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">静音維持</span>
              </div>
            </div>

            {settings.blockMedia && (
              <label className="flex items-center gap-2 mt-3 text-[11px] text-neutral-400 cursor-pointer hover:text-neutral-200">
                <input
                  type="checkbox"
                  checked={settings.blockFonts || false}
                  onChange={(e) => onUpdateSettings?.({ ...settings, blockFonts: e.target.checked })}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0"
                />
                <span>Webフォント通信もブロック（さらに軽量化）</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Account List Bar (Horizontal selector for multiple accounts) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
              登録アカウント一覧 ({accounts.length}件)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadAccountsInfo}
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 rounded-lg text-xs font-semibold transition cursor-pointer border border-neutral-700"
              title="アカウントID / アカウントpw が記載された「アカウント情報.xlsx」を出力"
            >
              <Download className="w-3.5 h-3.5" />
              アカウント情報.xlsx を出力
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-sky-400 rounded-lg text-xs font-semibold transition cursor-pointer border border-neutral-700">
              <Upload className="w-3.5 h-3.5" />
              アカウント情報 取込
              <input
                ref={accountInfoFileRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleUploadAccountsInfo}
              />
            </label>

            <button
              id="btn-add-account"
              onClick={onAddAccount}
              className="flex items-center gap-1.5 px-3 py-1 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              アカウント追加
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {accounts.map((acc) => {
            const isSelected = acc.id === selectedAccountId;
            const pendingCount = acc.tweets.filter((t) => t.status === 'pending').length;
            const isBrowser = (acc.postMethod || 'browser') === 'browser';

            return (
              <div
                key={acc.id}
                onClick={() => onSelectAccount(acc.id)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition relative group ${
                  isSelected
                    ? 'bg-neutral-800 border-sky-500 shadow-md ring-1 ring-sky-500/20'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-white truncate">
                        {acc.name}
                      </span>
                      {acc.isActive ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="有効" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-neutral-600" title="停止中" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono text-sky-400 block truncate">
                        {acc.handle}
                      </span>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isBrowser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {isBrowser ? 'ブラウザ' : 'API'}
                      </span>
                    </div>
                  </div>

                  {accounts.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAccount(acc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 rounded transition cursor-pointer"
                      title="このアカウントを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-500" />
                    {acc.minIntervalSec}s〜{acc.maxIntervalSec}s
                  </span>
                  <span className="text-amber-400">
                    未投稿: {pendingCount}件
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Detail Settings Form */}
      {currentAccount && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {currentAccount.name} の個別設定
                </h2>
                <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {currentAccount.handle}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                アカウントごとに異なる投稿方式（ブラウザ操作 / API）、Excelファイル、実行間隔を指定できます。
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onNavigateToSimulator && (
                <button
                  type="button"
                  onClick={onNavigateToSimulator}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                  title="Web上で自動ツイートのテスト動作を実行します"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Web上で動作テストする</span>
                </button>
              )}

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentAccount.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="rounded border-neutral-700 text-sky-500 focus:ring-sky-500 bg-neutral-950 cursor-pointer"
                />
                <span>自動実行を有効にする (isActive)</span>
              </label>
            </div>
          </div>

          {/* Post Method Toggle: Browser Automation (Free) vs X API (Paid) */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4">
            <label className="block text-xs font-semibold text-neutral-200 uppercase tracking-wider mb-2">
              投稿実行方式を選択
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => handleChange('postMethod', 'browser')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  postMethod === 'browser'
                    ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  postMethod === 'browser' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">ブラウザ自動操作 (Playwright / Selenium)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                      完全無料・API不要
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                    有料化されたX APIを使わず、Pythonでブラウザを自動操作してツイートします。通常アカウントで即日利用可能！
                  </p>
                </div>
              </div>

              <div
                onClick={() => handleChange('postMethod', 'api')}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  postMethod === 'api'
                    ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/30'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  postMethod === 'api' ? 'bg-purple-500/20 text-purple-400' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">X 公式 API 経由 (Tweepy)</span>
                    <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.2 rounded">
                      有料プラン契約者向け
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                    X Developer Portal で取得した API Key / Access Token を使用して公式API経由で投稿します。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Basic Info & Execution Interval */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                基本設定 ＆ 実行間隔設定 (秒)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    表示名 (メモ)
                  </label>
                  <input
                    type="text"
                    value={currentAccount.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                    placeholder="例: メインPRアカウント"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    アカウントID (Handle)
                  </label>
                  <input
                    type="text"
                    value={currentAccount.handle}
                    onChange={(e) => handleChange('handle', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-sky-400 focus:border-sky-500 focus:outline-none"
                    placeholder="@username"
                  />
                </div>
              </div>

              {/* Execution Interval Card (Highlighting user requirement) */}
              <div className="bg-neutral-950/70 border border-sky-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-sky-400" />
                    アカウントごとの投稿実行間隔（ランダム秒待機）
                  </span>
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    {currentAccount.minIntervalSec}秒 〜 {currentAccount.maxIntervalSec}秒
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  ツイートごとに <code className="text-neutral-300 bg-neutral-900 px-1 py-0.5 rounded">random.randint({currentAccount.minIntervalSec}, {currentAccount.maxIntervalSec})</code> 秒ランダムに待機します。
                  機械的な一定間隔ではなくランダム性を持たせることで、スパム検知やレート制限を回避します。
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                      最小待機時間 (秒)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={7200}
                      value={currentAccount.minIntervalSec}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 10);
                        handleChange('minIntervalSec', val);
                        if (val > currentAccount.maxIntervalSec) {
                          handleChange('maxIntervalSec', val + 30);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                      最大待機時間 (秒)
                    </label>
                    <input
                      type="number"
                      min={currentAccount.minIntervalSec}
                      max={86400}
                      value={currentAccount.maxIntervalSec}
                      onChange={(e) => {
                        const val = Math.max(currentAccount.minIntervalSec, parseInt(e.target.value) || 60);
                        handleChange('maxIntervalSec', val);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 text-[11px] text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentAccount.repeatMode}
                      onChange={(e) => handleChange('repeatMode', e.target.checked)}
                      className="rounded border-neutral-700 text-sky-500 focus:ring-sky-500 bg-neutral-900 cursor-pointer"
                    />
                    <span>全件投稿後に自動で未投稿にリセット（無限ループ投稿モード）</span>
                  </label>
                </div>
              </div>

              {/* Linked Excel file info */}
              <div className="bg-neutral-950/40 border border-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs text-neutral-300 font-medium block">
                      連動Excelファイル（下タブ1: 設定 / 下タブ2: ツイート文章）
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {currentAccount.excelFileName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => downloadAccountMultiTabExcel(currentAccount, currentAccount.excelFileName)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-emerald-400 rounded-lg text-xs font-semibold border border-neutral-700 transition cursor-pointer"
                  title="このアカウント専用のExcelファイル（設定＋ツイート文章）をダウンロード"
                >
                  <Download className="w-3.5 h-3.5" />
                  出力 (.xlsx)
                </button>
              </div>
            </div>

            {/* Right: Method-specific Settings */}
            {postMethod === 'browser' ? (
              /* Browser Automation Settings */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    ブラウザ自動操作用 ログイン設定
                  </h3>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    API完全不要
                  </span>
                </div>

                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    セッション自動永続化に対応
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    初回起動時、または事前にブラウザでXに1度ログインすれば、ログインセッション（Cookie・トークン）が自動保存されます。
                    <strong>次回以降はパスワード入力不要で直接ツイート投稿画面へ遷移します。</strong>
                  </p>
                </div>

                {/* Login ID */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    X ログインID (メールアドレス または ユーザー名)
                  </label>
                  <input
                    type="text"
                    value={currentAccount.loginId || ''}
                    onChange={(e) => handleChange('loginId', e.target.value)}
                    placeholder="例: your_email@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    ※ 自動ログイン時に使用します。空欄の場合は初回ブラウザ起動時に手動でログインすることも可能です。
                  </p>
                </div>

                {/* Login Password */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    X ログインパスワード (任意)
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys['loginPassword'] ? 'text' : 'password'}
                      value={currentAccount.loginPassword || ''}
                      onChange={(e) => handleChange('loginPassword', e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-neutral-200 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('loginPassword')}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showKeys['loginPassword'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    ※ パスワードを保存したくない場合は空欄のままで構いません。初回起動時のChrome画面で手動入力すればOKです。
                  </p>
                </div>

                {/* Browser Session Folder */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    セッション保存フォルダ名
                  </label>
                  <input
                    type="text"
                    value={currentAccount.profileDirName || currentAccount.handle.replace(/[@]/g, '')}
                    onChange={(e) => handleChange('profileDirName', e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-300 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    アカウントごとに異なるフォルダにCookieが保存されるため、複数アカウントが混ざる心配がありません。
                  </p>
                </div>

                {/* Google Colab auth_token */}
                <div className="pt-2 border-t border-neutral-850">
                  <label className="block text-xs font-medium text-amber-300 mb-1 flex items-center justify-between">
                    <span>Google Colab用 auth_token (任意)</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded">
                      クラウド実行用
                    </span>
                  </label>
                  <input
                    type="text"
                    value={currentAccount.authToken || ''}
                    onChange={(e) => handleChange('authToken', e.target.value)}
                    placeholder="F12 > Cookies > auth_token を貼り付け"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-300 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Google Colabでこのアカウントを自動投稿させる場合に使用します（Colabタブからも設定可能）。
                  </p>
                </div>
              </div>
            ) : (
              /* API Credentials */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-purple-400" />
                    X API 認証キー設定 (OAuth 1.0a User Context)
                  </h3>
                  <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    ローカル安全保存
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  画像アップロード（API v1.1）とツイート作成（API v2）の両方を実行するために、
                  X Developer Portalから取得した4つのキーを登録します。
                </p>

                {/* API Key */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    API Key (Consumer Key)
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys['apiKey'] ? 'text' : 'password'}
                      value={currentAccount.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="例: aBcDeFgHiJkLmNoPqRsTuVwXy"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-neutral-200 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('apiKey')}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showKeys['apiKey'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* API Key Secret */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    API Key Secret (Consumer Secret)
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys['apiSecret'] ? 'text' : 'password'}
                      value={currentAccount.apiSecret}
                      onChange={(e) => handleChange('apiSecret', e.target.value)}
                      placeholder="例: xYz1234567890..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-neutral-200 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('apiSecret')}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showKeys['apiSecret'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Access Token */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys['accessToken'] ? 'text' : 'password'}
                      value={currentAccount.accessToken}
                      onChange={(e) => handleChange('accessToken', e.target.value)}
                      placeholder="例: 1234567890-abcdef..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-neutral-200 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('accessToken')}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showKeys['accessToken'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Access Token Secret */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Access Token Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys['accessSecret'] ? 'text' : 'password'}
                      value={currentAccount.accessSecret}
                      onChange={(e) => handleChange('accessSecret', e.target.value)}
                      placeholder="例: 9876543210..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-neutral-200 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('accessSecret')}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showKeys['accessSecret'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    <strong>重要:</strong> X Developer Portal で App Permissions を「<strong>Read and Write</strong>」に変更した後に生成した Access Token を入力してください。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

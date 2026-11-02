import React, { useState } from 'react';
import { 
  Code2, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  FolderArchive, 
  Terminal, 
  ExternalLink,
  BookOpen,
  FileSpreadsheet,
  Globe,
  Sparkles,
  Layers,
  MousePointerClick,
  Cpu,
  RefreshCw,
  Mail,
  Zap,
  Sliders
} from 'lucide-react';
import { AccountConfig, BotOperationSettings, DmTargetItem } from '../types';
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
  BATCH_BUILD_EXE_TEMPLATE,
  BATCH_TEST_ONE_TWEET_TEMPLATE,
  DEFAULT_SETTINGS,
  DEFAULT_DM_TARGETS
} from '../data/defaultData';
import { generatePythonProjectZip } from '../utils/zipHelper';
import { downloadAccountExcel, downloadDmTargetsExcel } from '../utils/excelHelper';

interface PythonExporterProps {
  accounts: AccountConfig[];
  settings?: BotOperationSettings;
  dmTargets?: DmTargetItem[];
}

export const PythonExporter: React.FC<PythonExporterProps> = ({ 
  accounts, 
  settings = DEFAULT_SETTINGS,
  dmTargets = DEFAULT_DM_TARGETS
}) => {
  const [activeFile, setActiveFile] = useState<
    'bat' | 'rotationbat' | 'dmbat' | 'testbat' | 'playwright' | 'dmplaywright' | 'settingsjson' | 'json' | 'readme' | 'req'
  >('rotationbat');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // accounts.json の現在値
  const accountsJsonString = JSON.stringify(
    accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      handle: acc.handle,
      postMethod: acc.postMethod || 'browser',
      loginId: acc.loginId || '',
      loginPassword: acc.loginPassword || '',
      profileDirName: acc.profileDirName || acc.handle.replace(/[@]/g, ''),
      excelFileName: acc.excelFileName.endsWith('.xlsx') ? acc.excelFileName : `${acc.excelFileName}.xlsx`,
      minIntervalSec: acc.minIntervalSec,
      maxIntervalSec: acc.maxIntervalSec,
      actionsPerBatch: acc.actionsPerBatch || settings.actionsPerRotation,
      repeatMode: acc.repeatMode,
      isActive: acc.isActive,
      apiKey: acc.apiKey || 'YOUR_API_KEY',
      apiSecret: acc.apiSecret || 'YOUR_API_SECRET',
      accessToken: acc.accessToken || 'YOUR_ACCESS_TOKEN',
      accessSecret: acc.accessSecret || 'YOUR_ACCESS_SECRET',
    })),
    null,
    2
  );

  const settingsJsonString = JSON.stringify(settings, null, 2);

  const getActiveCode = () => {
    switch (activeFile) {
      case 'rotationbat':
        return BATCH_START_ROTATION_TEMPLATE;
      case 'dmbat':
        return BATCH_START_DM_TEMPLATE;
      case 'bat':
        return BATCH_START_TEMPLATE;
      case 'testbat':
        return BATCH_TEST_ONE_TWEET_TEMPLATE;
      case 'playwright':
        return PLAYWRIGHT_SCRIPT_TEMPLATE;
      case 'dmplaywright':
        return PLAYWRIGHT_DM_SCRIPT_TEMPLATE;
      case 'settingsjson':
        return settingsJsonString;
      case 'json':
        return accountsJsonString;
      case 'req':
        return BROWSER_REQUIREMENTS;
      case 'readme':
        return BROWSER_README;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await generatePythonProjectZip(accounts, settings, dmTargets);
    } catch (err: any) {
      alert(`ZIP生成エラー: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-sky-950/40 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                提案1＆提案2 実装済み
              </span>
              <span className="text-xs text-neutral-400">
                Playwright 完全無料・API不要
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>全自動実行コード ＆ 起動パック</span>
            </h2>
            <p className="text-neutral-400 text-xs max-w-2xl leading-relaxed">
              「1窓・順番交代ローテーション（提案1）」と「画像・動画ブロック（提案2）」が組み込まれた実行ファイル一式です。Windowsなら展開してバッチファイルをダブルクリックするだけで自動操縦が始まります。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-teal-400 hover:from-sky-300 hover:to-teal-300 text-neutral-950 font-bold text-sm shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>{isZipping ? 'ZIP作成中...' : '全自動起動パック (ZIP) をDL'}</span>
            </button>
          </div>
        </div>

        {/* 3-way features card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-800/80 text-xs">
          <div className="bg-neutral-950/80 p-3.5 rounded-xl border border-sky-500/30 space-y-1">
            <span className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              ① 提案1: 1窓順番交代ローテーション
            </span>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              常時開くブラウザは1つのみ。指定件数（{settings.actionsPerRotation}件）ごとに完全終了してメモリ解放＆アカウント交代。
            </p>
          </div>
          <div className="bg-neutral-950/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5" />
              ② 提案2: メディア遮断超軽量化
            </span>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              画像・動画通信を遮断し、メモリ50〜70%削減。低スペックPCでもファンが唸らず超高速に動作。
            </p>
          </div>
          <div className="bg-neutral-950/80 p-3.5 rounded-xl border border-purple-500/30 space-y-1">
            <span className="font-bold text-purple-400 flex items-center gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5" />
              ③ ツイート＆自動DM両対応
            </span>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              通常の自動ポストに加えて、自動DM＆フォロー用の <code className="text-purple-300">auto_dm_playwright.py</code> も同梱。
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Code tabs header */}
        <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              onClick={() => setActiveFile('rotationbat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'rotationbat'
                  ? 'bg-neutral-800 text-sky-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              START_ROTATION.bat (提案1ローテーション)
            </button>
            <button
              onClick={() => setActiveFile('dmbat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'dmbat'
                  ? 'bg-neutral-800 text-purple-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              START_DM.bat (自動DM)
            </button>
            <button
              onClick={() => setActiveFile('bat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'bat'
                  ? 'bg-neutral-800 text-emerald-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" />
              START.bat (通常起動)
            </button>
            <button
              onClick={() => setActiveFile('playwright')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'playwright'
                  ? 'bg-neutral-800 text-cyan-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              auto_tweet_playwright.py
            </button>
            <button
              onClick={() => setActiveFile('dmplaywright')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'dmplaywright'
                  ? 'bg-neutral-800 text-pink-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-pink-400" />
              auto_dm_playwright.py
            </button>
            <button
              onClick={() => setActiveFile('settingsjson')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'settingsjson'
                  ? 'bg-neutral-800 text-teal-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              settings.json
            </button>
            <button
              onClick={() => setActiveFile('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'json'
                  ? 'bg-neutral-800 text-amber-400 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              accounts.json
            </button>
            <button
              onClick={() => setActiveFile('readme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                activeFile === 'readme'
                  ? 'bg-neutral-800 text-neutral-200 border border-neutral-700 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              README.md
            </button>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-mono transition cursor-pointer flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">コピー完了！</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>コードをコピー</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content Area */}
        <div className="p-4 sm:p-5 overflow-x-auto bg-neutral-950 font-mono text-xs leading-relaxed text-neutral-300 max-h-[550px] overflow-y-auto">
          <pre className="whitespace-pre">{getActiveCode()}</pre>
        </div>
      </div>

      {/* Excel Download shortcuts for each account + DM targets */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-neutral-300 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Excelファイル個別ダウンロード
          </span>
          <button
            onClick={() => downloadDmTargetsExcel(dmTargets)}
            className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-[11px] font-semibold border border-purple-500/30 transition cursor-pointer"
          >
            <Download className="w-3 h-3" />
            dm_targets.xlsx をDL
          </button>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => downloadAccountExcel(acc.tweets, acc.excelFileName)}
              className="flex items-center justify-between p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 text-left transition cursor-pointer group"
            >
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white block truncate">
                  {acc.name}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 block truncate">
                  {acc.excelFileName}
                </span>
              </div>
              <Download className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition ml-2 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

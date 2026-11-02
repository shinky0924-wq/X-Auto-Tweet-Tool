import React from 'react';
import { 
  Terminal, 
  FileSpreadsheet, 
  Play, 
  Code2, 
  KeyRound, 
  Download, 
  Share2,
  Cloud
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'accounts' | 'simulator' | 'code' | 'guide' | 'colab';
  setActiveTab: (tab: 'accounts' | 'simulator' | 'code' | 'guide' | 'colab') => void;
  onDownloadZip: () => void;
  accountCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onDownloadZip,
  accountCount,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 flex items-center justify-center shadow-inner">
            <span className="text-white font-bold text-lg font-mono">𝕏</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                X Auto Tweet Tool
              </h1>
              <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                Python + Excel
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              複数アカウント対応・画像添付・ランダム間隔・Excel連動ボット
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav className="flex items-center gap-1 bg-neutral-950/70 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
          <button
            id="tab-accounts"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>アカウント＆Excel設定</span>
            <span className="text-[10px] bg-neutral-800 px-1.5 py-0.2 rounded-full text-neutral-400 font-mono">
              {accountCount}
            </span>
          </button>

          <button
            id="tab-simulator"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Play className="w-4 h-4 text-sky-400" />
            <span>実行シミュレーター</span>
          </button>

          <button
            id="tab-colab"
            onClick={() => setActiveTab('colab')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'colab'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Cloud className="w-4 h-4 text-amber-400" />
            <span>Google Colabで実行</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
              PC不要
            </span>
          </button>

          <button
            id="tab-code"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Code2 className="w-4 h-4 text-neutral-400" />
            <span>Pythonコード出力</span>
          </button>

          <button
            id="tab-guide"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>導入・運用ガイド</span>
          </button>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            id="btn-quick-download-zip"
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold text-xs sm:text-sm transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            title="Pythonコード、Excel、設定ファイル一式をZIPでダウンロード"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Python一式を</span>ZIP保存
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AccountManager } from './components/AccountManager';
import { ExcelSheetEditor } from './components/ExcelSheetEditor';
import { Simulator } from './components/Simulator';
import { PythonExporter } from './components/PythonExporter';
import { ApiGuide } from './components/ApiGuide';
import { ColabRunner } from './components/ColabRunner';
import { AccountConfig, TweetItem, BotOperationSettings, DmTargetItem } from './types';
import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, DEFAULT_DM_TARGETS } from './data/defaultData';
import { generatePythonProjectZip } from './utils/zipHelper';
import { FileSpreadsheet, Play, Code2, KeyRound, Cloud } from 'lucide-react';

const STORAGE_KEY = 'x_auto_tweet_accounts_v1';
const SETTINGS_STORAGE_KEY = 'x_auto_tweet_settings_v1';
const DM_TARGETS_STORAGE_KEY = 'x_auto_tweet_dmtargets_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'simulator' | 'code' | 'guide' | 'colab'>('accounts');

  // Load accounts from localStorage or fallback to defaults
  const [accounts, setAccounts] = useState<AccountConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved accounts, using defaults', e);
    }
    return DEFAULT_ACCOUNTS;
  });

  // Load operation settings (Proposal 1 & Proposal 2)
  const [settings, setSettings] = useState<BotOperationSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse saved settings, using defaults', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Load DM targets
  const [dmTargets, setDmTargets] = useState<DmTargetItem[]>(() => {
    try {
      const saved = localStorage.getItem(DM_TARGETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved DM targets, using defaults', e);
    }
    return DEFAULT_DM_TARGETS;
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return accounts[0]?.id || 'acc-1';
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(DM_TARGETS_STORAGE_KEY, JSON.stringify(dmTargets));
    } catch (e) {
      console.error('Failed to save DM targets to localStorage', e);
    }
  }, [dmTargets]);

  // Selected account helper
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Handlers
  const handleUpdateAccount = (updated: AccountConfig) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleAddAccount = () => {
    const newIdx = accounts.length + 1;
    const newAcc: AccountConfig = {
      id: `acc-${Date.now()}`,
      name: `新規アカウント #${newIdx}`,
      handle: `@account_${newIdx}`,
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      accessSecret: '',
      excelFileName: `tweets_account_${newIdx}.xlsx`,
      minIntervalSec: 60,
      maxIntervalSec: 180,
      repeatMode: false,
      isActive: true,
      tweets: [
        {
          id: 1,
          text: `アカウント #${newIdx} からの最初の自動ツイートです！`,
          image_path: 'images/sample.jpg',
          status: 'pending',
        },
      ],
    };
    setAccounts((prev) => [...prev, newAcc]);
    setSelectedAccountId(newAcc.id);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('最低1つのアカウントが必要です。');
      return;
    }
    if (window.confirm('このアカウント設定とツイートリストを削除しますか？')) {
      const remaining = accounts.filter((a) => a.id !== id);
      setAccounts(remaining);
      if (selectedAccountId === id) {
        setSelectedAccountId(remaining[0].id);
      }
    }
  };

  const handleUpdateTweetsForSelected = (tweets: TweetItem[]) => {
    if (!selectedAccount) return;
    handleUpdateAccount({
      ...selectedAccount,
      tweets,
    });
  };

  const handleUpdateFileNameForSelected = (fileName: string) => {
    if (!selectedAccount) return;
    handleUpdateAccount({
      ...selectedAccount,
      excelFileName: fileName,
    });
  };

  const handleUpdateAccountTweets = (accountId: string, tweets: TweetItem[]) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, tweets } : a))
    );
  };

  const handleDownloadZip = async () => {
    try {
      await generatePythonProjectZip(accounts, settings, dmTargets);
    } catch (err: any) {
      alert(`ZIPファイルの作成に失敗しました: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
        accountCount={accounts.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Tab 1: Accounts & Excel Sheet Editor */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <AccountManager
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              settings={settings}
              onUpdateSettings={setSettings}
              onSelectAccount={setSelectedAccountId}
              onUpdateAccount={handleUpdateAccount}
              onAddAccount={handleAddAccount}
              onDeleteAccount={handleDeleteAccount}
              onNavigateToSimulator={() => setActiveTab('simulator')}
            />

            {selectedAccount && (
              <ExcelSheetEditor
                account={selectedAccount}
                onUpdateAccount={handleUpdateAccount}
                onUpdateTweets={handleUpdateTweetsForSelected}
                onUpdateFileName={handleUpdateFileNameForSelected}
                onNavigateToSimulator={() => setActiveTab('simulator')}
              />
            )}
          </div>
        )}

        {/* Tab 2: Execution Simulator */}
        {activeTab === 'simulator' && (
          <Simulator
            accounts={accounts}
            settings={settings}
            onUpdateAccountTweets={handleUpdateAccountTweets}
          />
        )}

        {/* Tab 3: Google Colab Runner (No PC Install) */}
        {activeTab === 'colab' && (
          <ColabRunner
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onUpdateAccount={handleUpdateAccount}
            onNavigateToAccounts={() => setActiveTab('accounts')}
          />
        )}

        {/* Tab 4: Python Code & ZIP Export */}
        {activeTab === 'code' && (
          <PythonExporter 
            accounts={accounts} 
            settings={settings}
            dmTargets={dmTargets}
          />
        )}

        {/* Tab 5: API Key Setup Guide */}
        {activeTab === 'guide' && (
          <ApiGuide />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-neutral-850 bg-neutral-950 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            X (Twitter) Multi-Account Bot Generator &middot; 提案1（1窓ローテーション）＆提案2（メディア遮断）完全対応
          </span>
          <div className="flex items-center gap-4 text-neutral-400">
            <button
              onClick={() => setActiveTab('accounts')}
              className="hover:text-sky-400 transition cursor-pointer"
            >
              アカウント設定
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-sky-400 transition cursor-pointer"
            >
              シミュレーター
            </button>
            <button
              onClick={() => setActiveTab('colab')}
              className="hover:text-amber-400 text-amber-400/90 font-medium transition cursor-pointer"
            >
              Google Colab実行
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-sky-400 transition cursor-pointer"
            >
              Pythonコード
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className="hover:text-sky-400 transition cursor-pointer"
            >
              API取得マニュアル
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

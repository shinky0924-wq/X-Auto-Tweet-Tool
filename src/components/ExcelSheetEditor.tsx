import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Clock, 
  ExternalLink,
  FileSpreadsheet,
  Settings,
  MessageSquare,
  Play,
  Shuffle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { AccountConfig, TweetItem } from '../types';
import { downloadAccountMultiTabExcel, parseExcelFile } from '../utils/excelHelper';

interface ExcelSheetEditorProps {
  account: AccountConfig;
  onUpdateAccount?: (updated: AccountConfig) => void;
  onUpdateTweets: (tweets: TweetItem[]) => void;
  onUpdateFileName: (fileName: string) => void;
  onNavigateToSimulator?: () => void;
}

export const ExcelSheetEditor: React.FC<ExcelSheetEditorProps> = ({
  account,
  onUpdateAccount,
  onUpdateTweets,
  onUpdateFileName,
  onNavigateToSimulator,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<'settings' | 'tweets'>('settings');
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // 文字数カウント (X基準: 全角1文字、半角0.5文字相当)
  const calculateTwitterLength = (text: string): number => {
    let len = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if ((code >= 0x0020 && code <= 0x007e) || (code >= 0xff61 && code <= 0xff9f)) {
        len += 0.5;
      } else {
        len += 1;
      }
    }
    return Math.ceil(len);
  };

  // 下タブ1（設定）の値
  const intervalMinMin = account.intervalMinMinutes ?? Math.max(1, Math.round((account.minIntervalSec || 60) / 60));
  const intervalMaxMin = account.intervalMaxMinutes ?? Math.max(intervalMinMin, Math.round((account.maxIntervalSec || 600) / 60));
  const activeTimeStart = account.activeTimeStart || '0:00';
  const activeTimeEnd = account.activeTimeEnd || '0:00';
  const tweetOrderMode = account.tweetOrderMode !== undefined ? account.tweetOrderMode : 1; // 0: 上から順, 1: ランダム

  // 設定の更新ハンドラ
  const handleUpdateSetting = (field: keyof AccountConfig, value: any) => {
    if (!onUpdateAccount) return;
    const updated: AccountConfig = {
      ...account,
      [field]: value,
    };
    // 分と秒の同期
    if (field === 'intervalMinMinutes') {
      updated.minIntervalSec = Math.max(10, Number(value) * 60);
    }
    if (field === 'intervalMaxMinutes') {
      updated.maxIntervalSec = Math.max(updated.minIntervalSec, Number(value) * 60);
    }
    onUpdateAccount(updated);
  };

  // 新規ツイート行の追加
  const handleAddRow = () => {
    const nextId = account.tweets.length > 0 
      ? Math.max(...account.tweets.map(t => t.id)) + 1 
      : 1;
    const newTweet: TweetItem = {
      id: nextId,
      text: '',
      image_path: '',
      status: 'pending',
    };
    onUpdateTweets([...account.tweets, newTweet]);
    setEditingId(nextId);
    setActiveSheetTab('tweets');
  };

  // 行の削除
  const handleDeleteRow = (id: number) => {
    const filtered = account.tweets.filter(t => t.id !== id);
    onUpdateTweets(filtered);
  };

  // セルの更新
  const handleCellChange = (id: number, field: keyof TweetItem, value: any) => {
    const updated = account.tweets.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    });
    onUpdateTweets(updated);
  };

  // 全ステータスを未投稿（pending）にリセット
  const handleResetAllToPending = () => {
    if (window.confirm('すべてのツイートのステータスを「未投稿 (pending)」にリセットしますか？')) {
      const resetList = account.tweets.map(t => ({
        ...t,
        status: 'pending' as const,
        posted_at: '',
      }));
      onUpdateTweets(resetList);
    }
  };

  // Excelダウンロード（下タブ1: 設定、下タブ2: ツイート文章）
  const handleDownloadExcel = () => {
    downloadAccountMultiTabExcel(account, account.excelFileName);
  };

  // Excelファイルアップロード処理
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseExcelFile(file);
      if (res.tweets.length === 0 && !res.settings) {
        alert('有効なExcelデータが見つかりませんでした。');
        return;
      }
      if (res.tweets.length > 0) {
        onUpdateTweets(res.tweets);
      }
      if (res.settings && onUpdateAccount) {
        onUpdateAccount({
          ...account,
          intervalMinMinutes: res.settings.intervalMinMinutes,
          intervalMaxMinutes: res.settings.intervalMaxMinutes,
          activeTimeStart: res.settings.activeTimeStart,
          activeTimeEnd: res.settings.activeTimeEnd,
          tweetOrderMode: res.settings.tweetOrderMode,
          minIntervalSec: (res.settings.intervalMinMinutes || 1) * 60,
          maxIntervalSec: (res.settings.intervalMaxMinutes || 10) * 60,
          excelFileName: file.name,
        });
      } else {
        onUpdateFileName(file.name);
      }
      alert(`Excelファイル「${file.name}」から設定とツイート（${res.tweets.length}件）を読み込みました！`);
    } catch (err: any) {
      alert(`Excelファイルの読み込みに失敗しました: ${err.message}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ドラッグ＆ドロップ処理
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      try {
        const res = await parseExcelFile(file);
        if (res.tweets.length > 0) {
          onUpdateTweets(res.tweets);
        }
        if (res.settings && onUpdateAccount) {
          onUpdateAccount({
            ...account,
            intervalMinMinutes: res.settings.intervalMinMinutes,
            intervalMaxMinutes: res.settings.intervalMaxMinutes,
            activeTimeStart: res.settings.activeTimeStart,
            activeTimeEnd: res.settings.activeTimeEnd,
            tweetOrderMode: res.settings.tweetOrderMode,
            minIntervalSec: (res.settings.intervalMinMinutes || 1) * 60,
            maxIntervalSec: (res.settings.intervalMaxMinutes || 10) * 60,
            excelFileName: file.name,
          });
        } else {
          onUpdateFileName(file.name);
        }
      } catch (err: any) {
        alert(`ファイル読み込みエラー: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">
                Excel 管理（下タブ1: 設定 / 下タブ2: ツイート文章）
              </h3>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {account.tweets.length} 件登録中
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-400">対象ファイル名:</span>
              <input
                id="input-excel-filename"
                type="text"
                value={account.excelFileName}
                onChange={(e) => onUpdateFileName(e.target.value)}
                className="text-xs font-mono bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sky-400 w-48 focus:border-sky-500 focus:outline-none"
              />
              <span className="text-[11px] text-neutral-500">
                （例: {account.name}.xlsx）
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToSimulator && (
              <button
                id="btn-excel-test-now"
                type="button"
                onClick={onNavigateToSimulator}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs font-bold transition cursor-pointer shadow-sm"
                title="このExcel設定のままWeb上で自動投稿テストを開始します"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Web上でテスト実行
              </button>
            )}

            <button
              id="btn-add-tweet-row"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              ツイート追加
            </button>

            <button
              id="btn-download-excel"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
              title="下タブ1「設定」と下タブ2「ツイート文章」を含んだExcelファイル（.xlsx）を出力"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              {account.excelFileName || `${account.name}.xlsx`} をダウンロード
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition cursor-pointer">
              <Upload className="w-4 h-4 text-sky-400" />
              Excel取込
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {activeSheetTab === 'tweets' && (
              <button
                id="btn-reset-pending"
                onClick={handleResetAllToPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs transition cursor-pointer"
                title="全件を未投稿ステータスにリセット"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                未投稿にリセット
              </button>
            )}
          </div>
        </div>

        {/* Drop zone helper */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mt-3 p-2.5 rounded-lg border border-dashed text-center text-xs transition ${
            dragOver 
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' 
              : 'border-neutral-800 text-neutral-500 hover:border-neutral-700'
          }`}
        >
          既存の「{account.name}.xlsx」をここにドラッグ＆ドロップすると「設定」「ツイート文章」を自動判別して反映します
        </div>
      </div>

      {/* Excel Workbook Tabs (下タブ切り替え) */}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-1">
        <button
          onClick={() => setActiveSheetTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer border-t border-x ${
            activeSheetTab === 'settings'
              ? 'bg-[#214D8C] text-white border-[#2E6BC6] shadow-sm'
              : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border-neutral-800 hover:bg-neutral-850'
          }`}
        >
          <Settings className="w-4 h-4 text-sky-300" />
          <span>下タブ1: 設定</span>
          <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-normal">
            間隔 / 実行時間 / モード
          </span>
        </button>

        <button
          onClick={() => setActiveSheetTab('tweets')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer border-t border-x ${
            activeSheetTab === 'tweets'
              ? 'bg-emerald-900/80 text-white border-emerald-600 shadow-sm'
              : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border-neutral-800 hover:bg-neutral-850'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-300" />
          <span>下タブ2: ツイート文章</span>
          <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded font-mono font-normal">
            {account.tweets.length}件
          </span>
        </button>
      </div>

      {/* TAB 1: 設定 (Faithful recreation of user's image.png) */}
      {activeSheetTab === 'settings' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Excelシート「設定」の内容
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                ご提示いただいたExcelフォーマットをそのまま再現しています。ここで編集した値はダウンロードする「{account.excelFileName}」の「設定」タブに書き込まれます。
              </p>
            </div>
            <div className="text-[11px] text-sky-300 bg-sky-950/50 border border-sky-500/30 px-3 py-1 rounded-lg">
              📊 対象アカウント: <strong>{account.name}</strong> ({account.handle})
            </div>
          </div>

          {/* Visual Table Container matching image.png */}
          <div className="max-w-md mx-auto sm:mx-0 overflow-hidden rounded border border-[#2E6BC6] shadow-lg">
            {/* Section 1: ツイート間隔 */}
            <div className="bg-[#2B62AD] text-white text-center font-bold text-xs sm:text-sm py-2 px-3 leading-snug border-b border-[#204982]">
              <div>ツイート間隔</div>
              <div className="text-[11px] font-normal opacity-95">※指定の範囲内から毎回ランダム</div>
            </div>
            <div className="bg-white text-neutral-900 py-2.5 px-3 flex items-center justify-center gap-2 font-sans text-sm border-b border-[#2B62AD]">
              <input
                type="number"
                min={1}
                max={1440}
                value={intervalMinMin}
                onChange={(e) => handleUpdateSetting('intervalMinMinutes', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center font-bold text-neutral-950 border border-neutral-300 rounded py-1 px-1 text-sm focus:border-blue-600 focus:outline-none"
              />
              <span className="font-semibold text-neutral-800">分</span>
              <span className="font-bold text-neutral-600 px-1">〜</span>
              <input
                type="number"
                min={intervalMinMin}
                max={1440}
                value={intervalMaxMin}
                onChange={(e) => handleUpdateSetting('intervalMaxMinutes', Math.max(intervalMinMin, parseInt(e.target.value) || 10))}
                className="w-14 text-center font-bold text-neutral-950 border border-neutral-300 rounded py-1 px-1 text-sm focus:border-blue-600 focus:outline-none"
              />
              <span className="font-semibold text-neutral-800">分</span>
            </div>

            {/* Section 2: ツイート実行時間 */}
            <div className="bg-[#2B62AD] text-white text-center font-bold text-xs sm:text-sm py-2 px-3 leading-snug border-b border-[#204982]">
              <div>ツイート実行時間</div>
              <div className="text-[11px] font-normal opacity-95">(時:分～時:分)</div>
            </div>
            <div className="bg-white text-neutral-900 py-2.5 px-3 flex items-center justify-center gap-3 font-sans text-sm border-b border-[#2B62AD]">
              <input
                type="text"
                value={activeTimeStart}
                onChange={(e) => handleUpdateSetting('activeTimeStart', e.target.value)}
                placeholder="0:00"
                className="w-20 text-center font-bold font-mono text-neutral-950 border border-neutral-300 rounded py-1 px-1 text-sm focus:border-blue-600 focus:outline-none"
              />
              <span className="font-bold text-neutral-600">〜</span>
              <input
                type="text"
                value={activeTimeEnd}
                onChange={(e) => handleUpdateSetting('activeTimeEnd', e.target.value)}
                placeholder="0:00"
                className="w-20 text-center font-bold font-mono text-neutral-950 border border-neutral-300 rounded py-1 px-1 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Section 3: モード */}
            <div className="bg-[#2B62AD] text-white text-center font-bold text-xs sm:text-sm py-2 px-3 leading-snug border-b border-[#204982]">
              <div>モード</div>
              <div className="text-[11px] font-normal opacity-95">(0:上から順, 1:ランダム)</div>
            </div>
            <div className="bg-white text-neutral-900 py-2.5 px-3 flex flex-col items-center justify-center gap-1 font-sans text-sm">
              <div className="flex items-center gap-3">
                <select
                  value={tweetOrderMode}
                  onChange={(e) => handleUpdateSetting('tweetOrderMode', Number(e.target.value))}
                  className="font-bold text-neutral-950 border border-neutral-300 rounded py-1 px-3 text-sm focus:border-blue-600 focus:outline-none bg-neutral-50 cursor-pointer"
                >
                  <option value={1}>1 (ランダム順)</option>
                  <option value={0}>0 (上から順)</option>
                </select>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium mt-0.5">
                {tweetOrderMode === 1 ? '※ 投稿の都度ランダムな順序で投稿します' : '※ リストの上から順番通りに投稿します'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-300">
            <div className="flex items-center gap-2 font-bold text-sky-400">
              <Info className="w-4 h-4" />
              補足：Colab / Pythonスクリプトでの動作
            </div>
            <p className="leading-relaxed text-neutral-400">
              ・<strong>ツイート実行時間</strong>: <code className="text-white bg-neutral-800 px-1 py-0.5 rounded">0:00 〜 0:00</code> に設定されている場合は「24時間いつでも稼働」として扱われます。例えば <code className="text-white bg-neutral-800 px-1 py-0.5 rounded">09:00 〜 23:00</code> と指定すると、深夜帯は自動待機します。<br/>
              ・<strong>右上の緑色ボタン</strong>「{account.excelFileName} をダウンロード」を押すと、この「設定」タブと「ツイート文章」タブが合体したExcelファイル（.xlsx）が書き出されます。
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: ツイート文章 */}
      {activeSheetTab === 'tweets' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-neutral-950/90 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Excelシート「ツイート文章」の内容 ({account.tweets.length} 件)
            </span>
            <span className="text-[11px] text-neutral-400">
              ※ 各セルの内容は直接編集できます
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300 border-collapse">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-4 min-w-[320px]">ツイート文章 (本文)</th>
                  <th className="py-3 px-4 min-w-[220px]">画像パス (image_path)</th>
                  <th className="py-3 px-3 w-28 text-center">ステータス</th>
                  <th className="py-3 px-3 w-36">投稿日時</th>
                  <th className="py-3 px-3 w-14 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {account.tweets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      登録されたツイートがありません。「ツイート追加」ボタンから登録してください。
                    </td>
                  </tr>
                ) : (
                  account.tweets.map((tweet, idx) => {
                    const charCount = calculateTwitterLength(tweet.text);
                    const isOverLimit = charCount > 140;

                    return (
                      <tr 
                        key={tweet.id}
                        className={`hover:bg-neutral-800/40 transition group ${
                          tweet.status === 'posted' ? 'opacity-65' : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-3 px-3 text-center font-mono text-neutral-400">
                          {idx + 1}
                        </td>

                        {/* Tweet Text */}
                        <td className="py-2.5 px-4 align-top">
                          <div className="relative">
                            <textarea
                              rows={3}
                              value={tweet.text}
                              onChange={(e) => handleCellChange(tweet.id, 'text', e.target.value)}
                              placeholder="ツイート本文を入力してください... (改行やハッシュタグもそのまま反映されます)"
                              className="w-full bg-neutral-950/80 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-100 placeholder-neutral-600 focus:border-sky-500 focus:outline-none resize-y leading-relaxed"
                            />
                            <div className="flex justify-between items-center mt-1 px-1">
                              <span className="text-[10px] text-neutral-500">
                                {tweet.text.includes('\n') ? '複数行テキスト' : '単一行'}
                              </span>
                              <span
                                className={`text-[11px] font-mono px-1.5 py-0.2 rounded ${
                                  isOverLimit
                                    ? 'bg-rose-500/20 text-rose-400 font-bold'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {charCount}/140字 {isOverLimit && '(文字数超過注意)'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Image Path */}
                        <td className="py-2.5 px-4 align-top">
                          <div className="space-y-1.5">
                            <div className="relative flex items-center">
                              <ImageIcon className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5" />
                              <input
                                type="text"
                                value={tweet.image_path}
                                onChange={(e) => handleCellChange(tweet.id, 'image_path', e.target.value)}
                                placeholder="例: images/sample.jpg"
                                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-lg py-1.5 pl-8 pr-2.5 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:border-sky-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-500 px-1">
                              <span>カンマ区切りで最大4枚</span>
                              {tweet.image_path ? (
                                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                                  添付あり
                                </span>
                              ) : (
                                <span className="text-neutral-600">テキストのみ</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center align-top">
                          <select
                            value={tweet.status}
                            onChange={(e) => handleCellChange(tweet.id, 'status', e.target.value)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${
                              tweet.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : tweet.status === 'posted'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : tweet.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            }`}
                          >
                            <option value="pending">未投稿</option>
                            <option value="posted">投稿済</option>
                            <option value="failed">失敗</option>
                            <option value="skipped">スキップ</option>
                          </select>
                        </td>

                        {/* Posted At */}
                        <td className="py-3 px-3 font-mono text-[11px] text-neutral-400 align-top">
                          {tweet.posted_at ? (
                            <div className="flex items-center gap-1 text-neutral-400">
                              <Clock className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                              <span className="truncate">{tweet.posted_at}</span>
                            </div>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center align-top">
                          <div className="flex items-center justify-center gap-1">
                            <a
                              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet.text)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-neutral-950 border border-sky-500/30 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 shadow-sm whitespace-nowrap"
                              title="ブラウザのX画面を直接開いてこの文章で今すぐ投稿テスト（Pythonインストール不要！）"
                            >
                              <ExternalLink className="w-3 h-3" />
                              実ポスト
                            </a>
                            <button
                              onClick={() => handleDeleteRow(tweet.id)}
                              className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition cursor-pointer"
                              title="行を削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer info */}
          <div className="bg-neutral-950/60 p-3 px-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
            <div className="flex items-center gap-3">
              <span>未投稿: <strong className="text-amber-400 font-mono">{account.tweets.filter(t => t.status === 'pending').length}</strong> 件</span>
              <span>投稿済: <strong className="text-emerald-400 font-mono">{account.tweets.filter(t => t.status === 'posted').length}</strong> 件</span>
            </div>
            <div className="text-[11px] text-neutral-500">
              ※ Python実行時、投稿が成功した行は自動的に <code className="bg-neutral-800 text-neutral-300 px-1 rounded">posted</code> に更新され日時が記録されます。
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

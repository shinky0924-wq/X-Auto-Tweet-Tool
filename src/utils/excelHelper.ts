import * as XLSX from 'xlsx';
import { AccountConfig, TweetItem, DmTargetItem } from '../types';

/**
 * 1. アカウント情報.xlsx 用のワークシート生成
 * 列: アカウントID | アカウントpw | アカウント名 | auth_token(任意)
 */
export function accountsToInfoWorksheet(accounts: AccountConfig[]): XLSX.WorkSheet {
  const headers = ['アカウントID', 'アカウントpw', 'アカウント名', 'auth_token'];
  const rows = accounts.map((acc) => [
    acc.loginId || acc.handle || '',
    acc.loginPassword || '',
    acc.name || '',
    acc.authToken || '',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = [
    { wch: 24 }, // アカウントID
    { wch: 24 }, // アカウントpw
    { wch: 22 }, // アカウント名
    { wch: 35 }, // auth_token
  ];

  return worksheet;
}

/**
 * アカウント情報.xlsx のダウンロード
 */
export function downloadAccountsInfoExcel(accounts: AccountConfig[], fileName = 'アカウント情報.xlsx') {
  const worksheet = accountsToInfoWorksheet(accounts);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'アカウント情報');

  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName);
}

/**
 * アカウント情報.xlsx のバイナリデータ（ZIP生成用）
 */
export function accountsInfoToExcelBinary(accounts: AccountConfig[]): Uint8Array {
  const worksheet = accountsToInfoWorksheet(accounts);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'アカウント情報');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buffer);
}

/**
 * アカウント情報.xlsx の読み込み
 */
export async function parseAccountsInfoExcel(
  file: File
): Promise<Array<{ id: string; loginId: string; loginPassword?: string; name?: string; authToken?: string }>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const parsed = rows.map((row, idx) => {
          const loginId = String(
            row['アカウントID'] || row['ID'] || row['ユーザー名'] || row['username'] || row['loginId'] || ''
          ).trim();
          const loginPassword = String(
            row['アカウントpw'] || row['pw'] || row['パスワード'] || row['password'] || ''
          ).trim();
          const name = String(row['アカウント名'] || row['名前'] || row['name'] || `アカウント #${idx + 1}`).trim();
          const authToken = String(row['auth_token'] || row['authToken'] || row['トークン'] || '').trim();

          return {
            id: `imported-${Date.now()}-${idx}`,
            loginId,
            loginPassword,
            name,
            authToken,
          };
        }).filter((item) => item.loginId || item.name);

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 2. アカウント名.xlsx の「設定」シート（タブ1）の生成
 * ユーザー提示画像 (image.png) の構造を完全再現:
 * [行1] ツイート間隔
 * [行2] ※指定の範囲内から毎回ランダム
 * [行3] 1 | 分 | 〜 | 10 | 分
 * [行4] ツイート実行時間
 * [行5] (時:分～時:分)
 * [行6] 0:00 | 〜 | 0:00
 * [行7] モード
 * [行8] (0:上から順,1:ランダム)
 * [行9] 1
 */
export function accountToConfigWorksheet(account: AccountConfig): XLSX.WorkSheet {
  const minMin = account.intervalMinMinutes ?? Math.max(1, Math.round((account.minIntervalSec || 60) / 60));
  const maxMin = account.intervalMaxMinutes ?? Math.max(minMin, Math.round((account.maxIntervalSec || 600) / 60));
  const startTime = account.activeTimeStart || '0:00';
  const endTime = account.activeTimeEnd || '0:00';
  const mode = account.tweetOrderMode !== undefined ? account.tweetOrderMode : 1; // 0: 上から順, 1: ランダム

  const aoaData: any[][] = [
    ['ツイート間隔', '', '', '', ''],
    ['※指定の範囲内から毎回ランダム', '', '', '', ''],
    [minMin, '分', '〜', maxMin, '分'],
    ['ツイート実行時間', '', '', '', ''],
    ['(時:分～時:分)', '', '', '', ''],
    [startTime, '〜', endTime, '', ''],
    ['モード', '', '', '', ''],
    ['(0:上から順,1:ランダム)', '', '', '', ''],
    [mode, '', '', '', ''],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

  // 幅の調整
  worksheet['!cols'] = [
    { wch: 12 }, // 数値 / 時間
    { wch: 8 },  // 単位 (分 / 〜)
    { wch: 6 },  // 記号 (〜)
    { wch: 12 }, // 数値 / 時間
    { wch: 8 },  // 単位 (分)
  ];

  return worksheet;
}

/**
 * 3. アカウント名.xlsx の「ツイート文章」シート（タブ2）の生成
 */
export function accountToTweetsWorksheet(tweets: TweetItem[]): XLSX.WorkSheet {
  const headers = ['No', 'ツイート文章', '画像パス', 'ステータス', '投稿日時'];
  const rows = tweets.map((t, idx) => [
    t.id || idx + 1,
    t.text || '',
    t.image_path || '',
    t.status || 'pending',
    t.posted_at || '',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 60 }, // ツイート文章
    { wch: 25 }, // 画像パス
    { wch: 12 }, // ステータス
    { wch: 22 }, // 投稿日時
  ];

  return worksheet;
}

/**
 * アカウント名.xlsx（下タブ1: 設定、下タブ2: ツイート文章）のワークブック生成
 */
export function buildAccountWorkbook(account: AccountConfig): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // 下タブ1: 設定
  const configSheet = accountToConfigWorksheet(account);
  XLSX.utils.book_append_sheet(workbook, configSheet, '設定');

  // 下タブ2: ツイート文章
  const tweetsSheet = accountToTweetsWorksheet(account.tweets);
  XLSX.utils.book_append_sheet(workbook, tweetsSheet, 'ツイート文章');

  return workbook;
}

/**
 * アカウント名.xlsx のダウンロード
 */
export function downloadAccountMultiTabExcel(account: AccountConfig, customFileName?: string) {
  const workbook = buildAccountWorkbook(account);
  const baseName = customFileName || account.excelFileName || `${account.name}.xlsx`;
  const safeFileName = baseName.endsWith('.xlsx') ? baseName : `${baseName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName);
}

/**
 * アカウント名.xlsx のバイナリ出力 (ZIP用)
 */
export function accountMultiTabToBinary(account: AccountConfig): Uint8Array {
  const workbook = buildAccountWorkbook(account);
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buffer);
}

/**
 * 互換用: 旧 downloadAccountExcel (現在は2タブ構造で出力)
 */
export function downloadAccountExcel(tweets: TweetItem[], fileName: string, account?: AccountConfig) {
  if (account) {
    downloadAccountMultiTabExcel({ ...account, tweets }, fileName);
  } else {
    // 最小限のアカウント情報で2タブ作成
    const fallbackAcc: AccountConfig = {
      id: 'temp',
      name: fileName.replace('.xlsx', ''),
      handle: '',
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      accessSecret: '',
      excelFileName: fileName,
      minIntervalSec: 60,
      maxIntervalSec: 600,
      intervalMinMinutes: 1,
      intervalMaxMinutes: 10,
      activeTimeStart: '0:00',
      activeTimeEnd: '0:00',
      tweetOrderMode: 1,
      repeatMode: true,
      isActive: true,
      tweets,
    };
    downloadAccountMultiTabExcel(fallbackAcc, fileName);
  }
}

/**
 * 互換用: 旧 tweetsToExcelBinary
 */
export function tweetsToExcelBinary(tweets: TweetItem[]): Uint8Array {
  const fallbackAcc: AccountConfig = {
    id: 'temp',
    name: 'tweets',
    handle: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessSecret: '',
    excelFileName: 'tweets.xlsx',
    minIntervalSec: 60,
    maxIntervalSec: 600,
    intervalMinMinutes: 1,
    intervalMaxMinutes: 10,
    activeTimeStart: '0:00',
    activeTimeEnd: '0:00',
    tweetOrderMode: 1,
    repeatMode: true,
    isActive: true,
    tweets,
  };
  return accountMultiTabToBinary(fallbackAcc);
}

/**
 * 多機能 Excel 読み込みパーサー
 * 「設定」タブと「ツイート文章」タブの両方に対応！
 */
export interface ParsedExcelResult {
  tweets: TweetItem[];
  settings?: {
    intervalMinMinutes?: number;
    intervalMaxMinutes?: number;
    activeTimeStart?: string;
    activeTimeEnd?: string;
    tweetOrderMode?: number;
  };
}

export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let tweetsSheetName = workbook.SheetNames.find(
          (name) => name.includes('ツイート') || name.includes('文章') || name.includes('Tweet')
        );
        let configSheetName = workbook.SheetNames.find(
          (name) => name.includes('設定') || name.includes('Config') || name.includes('Setting')
        );

        // タブ名が一致しない場合は、第1シートか第2シートを推測
        if (!tweetsSheetName && workbook.SheetNames.length > 1 && configSheetName) {
          tweetsSheetName = workbook.SheetNames.find((n) => n !== configSheetName);
        } else if (!tweetsSheetName) {
          tweetsSheetName = workbook.SheetNames[0];
        }

        // 1. 設定シートの解析
        let settings: ParsedExcelResult['settings'] = undefined;
        if (configSheetName) {
          const configSheet = workbook.Sheets[configSheetName];
          const rawAoa: any[][] = XLSX.utils.sheet_to_json(configSheet, { header: 1, defval: '' });

          let intervalMin = 1;
          let intervalMax = 10;
          let startTime = '0:00';
          let endTime = '0:00';
          let mode = 1;

          // 行を順次探索
          for (let i = 0; i < rawAoa.length; i++) {
            const rowStr = rawAoa[i].join(' ');
            if (rowStr.includes('ツイート間隔') || rowStr.includes('範囲内')) {
              // 次の行に数値があるか確認
              const valRow = rawAoa[i + 1] || rawAoa[i + 2] || [];
              const nums = valRow.filter((v: any) => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''));
              if (nums.length >= 2) {
                intervalMin = Math.max(1, Number(nums[0]));
                intervalMax = Math.max(intervalMin, Number(nums[1]));
              } else if (nums.length === 1) {
                intervalMin = Math.max(1, Number(nums[0]));
              }
            }

            if (rowStr.includes('ツイート実行時間') || rowStr.includes('時:分')) {
              const valRow = rawAoa[i + 1] || rawAoa[i + 2] || [];
              const times = valRow.filter((v: any) => String(v).includes(':') || typeof v === 'string');
              if (times.length >= 2) {
                startTime = String(times[0]).trim();
                endTime = String(times[1]).trim();
              } else if (times.length === 1) {
                const parts = String(times[0]).split('〜').map((s) => s.trim());
                if (parts.length >= 2) {
                  startTime = parts[0];
                  endTime = parts[1];
                }
              }
            }

            if (rowStr.includes('モード') || rowStr.includes('0:上から順')) {
              const valRow = rawAoa[i + 1] || rawAoa[i + 2] || [];
              const foundMode = valRow.find((v: any) => v === 0 || v === 1 || v === '0' || v === '1');
              if (foundMode !== undefined) {
                mode = Number(foundMode);
              }
            }
          }

          settings = {
            intervalMinMinutes: intervalMin,
            intervalMaxMinutes: intervalMax,
            activeTimeStart: startTime,
            activeTimeEnd: endTime,
            tweetOrderMode: mode,
          };
        }

        // 2. ツイート文章シートの解析
        const tweetsSheet = workbook.Sheets[tweetsSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(tweetsSheet, { defval: '' });

        const tweets: TweetItem[] = jsonRows.map((row, index) => ({
          id: Number(row.No || row.no || row.id || row.ID) || index + 1,
          text: String(
            row['ツイート文章'] || row['ツイート本文'] || row['本文'] || row.text || row.Text || ''
          ).trim(),
          image_path: String(
            row['画像パス'] || row['画像'] || row.image_path || row.ImagePath || ''
          ).trim(),
          status: (['pending', 'posted', 'failed', 'skipped'].includes(
            String(row['ステータス'] || row.status || '').toLowerCase()
          )
            ? String(row['ステータス'] || row.status).toLowerCase()
            : 'pending') as TweetItem['status'],
          posted_at: String(
            row['投稿日時'] || row.posted_at || row.PostedAt || ''
          ).trim(),
        })).filter((item) => item.text.length > 0 || item.image_path.length > 0);

        resolve({
          tweets,
          settings,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 7. dm_targets.xlsx 用のワークシート生成（自動DM＆フォロー用）
 */
export function dmTargetsToWorksheet(targets: DmTargetItem[]): XLSX.WorkSheet {
  const headers = ['id', 'target_username', 'message', 'status', 'auto_follow', 'sent_at', 'error_message'];
  const rows = targets.map((t) => [
    t.id,
    t.targetUsername.startsWith('@') ? t.targetUsername : `@${t.targetUsername}`,
    t.messageText,
    t.status,
    t.autoFollow ? 1 : 0,
    t.sent_at || '',
    t.error_message || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 22 },
    { wch: 45 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 25 },
  ];
  return ws;
}

export function dmTargetsToExcelBinary(targets: DmTargetItem[]): Uint8Array {
  const ws = dmTargetsToWorksheet(targets);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DM送信先');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buffer);
}

export function downloadDmTargetsExcel(targets: DmTargetItem[], fileName = 'dm_targets.xlsx') {
  const ws = dmTargetsToWorksheet(targets);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DM送信先');
  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}


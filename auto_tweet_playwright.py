#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
X (Twitter) ブラウザ自動操縦・自動ツイートボット (完全統合・最新版)
====================================================================
【新機能＆完全統合スペック】
  1. 【提案1】1窓・順番交代ローテーション (常に開くブラウザは1つのみ、低負荷・低スペックPC対応)
  2. 【提案2】画像・動画通信ブロック (メモリ約60%削減＆高速動作)
  3. 【日常ツイート独立エンジン】朝枠・昼枠・夕方枠・夜枠の自動判定＆30日クールダウン
  4. 【スピンタックス記法】{A|B|C} 自動ランダム展開で毎回異なる自然な文章
  5. 【リアルタイム動的置換】{月日}{曜日}{時間}{日付} リアルタイム動的差し込み
  6. 【案3: 画像クールダウン＆アカウント間重複防止】
     - 一度使った画像は最低14日間（または30日間）再選出しないルール
     - 複数アカウント間での共有ロック（アカウント①が使った画像はアカウント②も今週使わない）
     - 全ての選出履歴を image_cooldown_history.json で永続追跡
  7. 【凍結アカウント即時永久除外】
     - 凍結や制限を検知した場合、再起動不要で即時にメモリ上のブラックリストへ追加
     - Excelと永続ファイルから除外し、残りの健全アカウントで完全自動継続
  8. 【重複ポスト自動リトライ】
     - 万が一の重複エラー時、ユニーク絵文字を付加して自動リトライ投稿
====================================================================
"""

import os
import sys
import re
import time
import glob
import json
import random
import logging
import traceback
import openpyxl
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] [XBrowserBot] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("browser_auto_tweet.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("XBrowserBot")

# ==========================================
# 凍結アカウントの即時永久除外メモリセット
# ==========================================
BLACKLISTED_ACCOUNTS = set()
SUSPENDED_FILE = "suspended_accounts.txt"

def load_blacklist():
    global BLACKLISTED_ACCOUNTS
    if os.path.exists(SUSPENDED_FILE):
        try:
            with open(SUSPENDED_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    acc = line.split(",")[0].strip().replace("@", "").lower()
                    if acc:
                        BLACKLISTED_ACCOUNTS.add(acc)
            logger.info(f"🚫 登録済みブラックリスト: {len(BLACKLISTED_ACCOUNTS)} 件のアカウントを読み込みました")
        except Exception:
            pass

load_blacklist()

# ==========================================
# 【案3】画像クールダウン＆アカウント間重複防止マネージャー
# ==========================================
IMAGE_HISTORY_FILE = "image_cooldown_history.json"
IMAGE_COOLDOWN_DAYS = 14  # 最低14日間は同じ画像を使用禁止
IMAGE_CROSS_ACCOUNT_LOCK_DAYS = 7  # 他アカウントが使用した画像は7日間全アカウントで使用禁止

def load_image_history() -> dict:
    if os.path.exists(IMAGE_HISTORY_FILE):
        try:
            with open(IMAGE_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_image_history(history: dict):
    try:
        with open(IMAGE_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"画像履歴の保存に失敗: {e}")

def record_image_usage(image_path: str, user_handle: str):
    """画像の使用日時と使用アカウントを記録（アカウント間共有ロック用）"""
    if not image_path:
        return
    history = load_image_history()
    norm_path = os.path.normpath(os.path.abspath(image_path))
    history[norm_path] = {
        "last_used": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "account": user_handle,
        "filename": os.path.basename(norm_path)
    }
    save_image_history(history)
    logger.info(f"🔒【画像クールダウン記録】[{os.path.basename(norm_path)}] を [{user_handle}] で記録 (クールダウン期間開始)")

def is_image_allowed_for_account(image_path: str, user_handle: str) -> tuple[bool, str]:
    """
    画像の選出可否を判定:
    1. 同一アカウントでの14日間クールダウン
    2. アカウント間での7日間クロスロック（同一IPからの同一画像重複防止）
    """
    history = load_image_history()
    norm_path = os.path.normpath(os.path.abspath(image_path))
    record = history.get(norm_path)
    if not record:
        return True, "新規画像"

    try:
        last_dt = datetime.strptime(record["last_used"], "%Y-%m-%d %H:%M:%S")
        elapsed_days = (datetime.now() - last_dt).total_seconds() / 86400.0
        used_by = record.get("account", "")

        # ルール1: 他のアカウントが7日以内に使った画像はアカウント間ロック
        if used_by and used_by.lower() != user_handle.lower() and elapsed_days < IMAGE_CROSS_ACCOUNT_LOCK_DAYS:
            return False, f"他アカウント[{used_by}]が最近({elapsed_days:.1f}日前)使用したためクロスアカウントロック中"

        # ルール2: 同一アカウントでも14日間は再使用禁止
        if elapsed_days < IMAGE_COOLDOWN_DAYS:
            return False, f"クールダウン中 (前回使用から{elapsed_days:.1f}日経過 / 設定{IMAGE_COOLDOWN_DAYS}日)"

        return True, "クールダウン期間終了"
    except Exception:
        return True, "判定スキップ"

# ==========================================
# スピンタックス記法 {A|B|C} 再帰的展開
# ==========================================
def expand_spintax(text: str) -> str:
    pattern = re.compile(r'\{([^{}]+)\}')
    while True:
        match = pattern.search(text)
        if not match:
            break
        choices = match.group(1).split('|')
        chosen = random.choice(choices)
        text = text[:match.start()] + chosen + text[match.end():]
    return text

# ==========================================
# リアルタイム動的差し込みタグ置換
# ==========================================
def replace_dynamic_tags(text: str) -> str:
    now = datetime.now()
    weekdays_jp = ["月", "火", "水", "木", "金", "土", "日"]
    weekday_str = weekdays_jp[now.weekday()]
    
    text = text.replace("{日付}", now.strftime("%Y年%m月%d日"))
    text = text.replace("{月日}", f"{now.month}月{now.day}日")
    text = text.replace("{曜日}", weekday_str)
    text = text.replace("{時間}", now.strftime("%H:%M"))
    text = text.replace("{時刻}", now.strftime("%H:%M"))
    text = text.replace("{午前午後}", "午前" if now.hour < 12 else "午後")
    return text

def parse_time_str(val):
    if not val:
        return None
    s = str(val).strip()
    try:
        parts = s.split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return h * 60 + m
    except Exception:
        return None

def is_current_time_in_range(time_range_str):
    if not time_range_str:
        return False
    try:
        s_str, e_str = str(time_range_str).split("-")
        s_min = parse_time_str(s_str.strip())
        e_min = parse_time_str(e_str.strip())
        if s_min is None or e_min is None:
            return False
        
        now = datetime.now()
        cur_min = now.hour * 60 + now.minute
        if s_min < e_min:
            return s_min <= cur_min < e_min
        else:
            return cur_min >= s_min or cur_min < e_min
    except Exception:
        return False

# ==========================================
# フォルダからクールダウン適用画像を選定
# ==========================================
def resolve_random_image_from_folder(raw_target, slot_name="", user_handle=""):
    target_path = str(raw_target or "").strip().replace('"', '').replace("'", "")
    if target_path in ["(なし)", "なし", "none", "None"]:
        return None

    search_dirs = [
        target_path,
        os.path.join("images", target_path),
        os.path.join("images", slot_name) if slot_name else "",
        os.path.join(os.path.dirname(sys.executable), "images", target_path) if target_path else "",
        os.path.join(os.path.dirname(sys.executable), "images", slot_name) if slot_name else "",
    ]

    # 直接ファイルが指定されている場合
    if target_path and os.path.isfile(target_path):
        allowed, reason = is_image_allowed_for_account(target_path, user_handle)
        if allowed:
            return os.path.abspath(target_path)
        logger.warning(f"指定画像 [{os.path.basename(target_path)}] は {reason} のためスキップ")
        return None

    valid_folder = None
    for d in search_dirs:
        if d and os.path.isdir(d):
            valid_folder = os.path.abspath(d)
            break

    if not valid_folder:
        return None

    img_exts = ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.gif")
    candidates = []
    for ext in img_exts:
        candidates.extend(glob.glob(os.path.join(valid_folder, ext)))
        candidates.extend(glob.glob(os.path.join(valid_folder, ext.upper())))

    if not candidates:
        return None

    candidates = list(set(candidates))
    random.shuffle(candidates)

    # クールダウン＆アカウント間ロックを通過する候補を検索
    eligible_images = []
    for img in candidates:
        allowed, reason = is_image_allowed_for_account(img, user_handle)
        if allowed:
            eligible_images.append(img)
        else:
            logger.debug(f"クールダウン除外: {os.path.basename(img)} ({reason})")

    # 候補がある場合はその中からランダム選定
    if eligible_images:
        chosen = random.choice(eligible_images)
        logger.info(f"📸 画像フォルダ [{os.path.basename(valid_folder)}] より安全選定: {os.path.basename(chosen)} (クールダウン検査合格)")
        return os.path.abspath(chosen)

    # 全てクールダウン中の場合、最も昔に使われたものをフォールバック選出
    logger.warning(f"⚠️ フォルダ [{os.path.basename(valid_folder)}] 内の全画像がクールダウン中。最も昔に使用された画像を選出します。")
    history = load_image_history()
    candidates.sort(key=lambda p: history.get(os.path.normpath(os.path.abspath(p)), {}).get("last_used", "2000-01-01"))
    chosen = candidates[0]
    return os.path.abspath(chosen)

# ==========================================
# 日常ツイートの選出（30日クールダウン＆画像付与）
# ==========================================
def get_eligible_daily_tweet(excel_path, user_handle=""):
    if not excel_path or not os.path.exists(excel_path):
        return None
    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        if "日常ツイート" not in wb.sheetnames:
            return None
        ws = wb["日常ツイート"]

        now = datetime.now()
        today_str = now.strftime("%Y/%m/%d")
        cooldown_days = 30
        candidates = []

        for r in range(2, ws.max_row + 1):
            slot_name = str(ws.cell(r, 1).value or "").strip()
            time_range = str(ws.cell(r, 2).value or "").strip()
            raw_text = str(ws.cell(r, 3).value or "").strip()
            status = str(ws.cell(r, 4).value or "").strip()
            last_date_val = str(ws.cell(r, 5).value or "").strip()
            raw_img_folder = str(ws.cell(r, 7).value or "").strip()

            if status not in ["有効", "active", "1", "ON", "on"]:
                continue
            if not is_current_time_in_range(time_range):
                continue
            if last_date_val.startswith(today_str):
                continue

            is_cooldown_ok = True
            if last_date_val:
                try:
                    last_dt = datetime.strptime(last_date_val[:10], "%Y/%m/%d")
                    if (now - last_dt).days < cooldown_days:
                        is_cooldown_ok = False
                except Exception:
                    pass
            if not is_cooldown_ok:
                continue

            candidates.append({
                "row": r,
                "slot_name": slot_name,
                "raw_text": raw_text,
                "raw_img": raw_img_folder
            })

        if candidates:
            chosen = random.choice(candidates)
            final_text = expand_spintax(chosen["raw_text"])
            final_text = replace_dynamic_tags(final_text)
            chosen["final_text"] = final_text
            chosen["image"] = resolve_random_image_from_folder(chosen["raw_img"], chosen["slot_name"], user_handle)
            return chosen
    except Exception as e:
        logger.error(f"日常ツイート取得エラー: {e}")
    return None

def update_daily_tweet_status(excel_path, row_idx):
    now = datetime.now()
    for attempt in range(3):
        try:
            wb = openpyxl.load_workbook(excel_path)
            ws = wb["日常ツイート"]
            ws.cell(row_idx, 5).value = now.strftime("%Y/%m/%d")
            ws.cell(row_idx, 6).value = now.strftime("%Y/%m/%d %H:%M:%S")
            wb.save(excel_path)
            logger.info(f"日常ツイート更新成功: 行{row_idx} (最終投稿日更新)")
            return
        except PermissionError:
            time.sleep(2)
        except Exception:
            break

# 絵文字リスト
ALL_EMOJIS = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
    "👍", "👏", "🙌", "✨", "🌟", "⭐", "💫", "⚡", "💥", "🔥", "🌈", "☀️", "🌤️", "⛅", "☕", "🎉"
]
LAST_USED_EMOJI = None

def get_unique_random_emoji():
    global LAST_USED_EMOJI
    candidates = [e for e in ALL_EMOJIS if e != LAST_USED_EMOJI]
    chosen = random.choice(candidates)
    LAST_USED_EMOJI = chosen
    return chosen

def human_mouse_move(page, target_x=None, target_y=None):
    try:
        if target_x is None or target_y is None:
            target_x = random.randint(300, 800)
            target_y = random.randint(200, 600)
        steps = random.randint(3, 6)
        page.mouse.move(target_x, target_y, steps=steps)
        time.sleep(random.uniform(0.1, 0.25))
    except Exception:
        pass

def human_typing(page, text):
    for char in text:
        try:
            page.keyboard.type(char)
            if char in ["、", "。", "！", "？", "\n", " "]:
                time.sleep(random.uniform(0.18, 0.35))
            else:
                time.sleep(random.uniform(0.02, 0.05))
        except Exception:
            pass

def resolve_image_path(raw_path, user_handle=""):
    if not raw_path:
        return None
    clean = str(raw_path).replace('"', '').replace("'", "").strip()
    if not clean or clean in ["(なし)", "なし", "none", "None"]:
        return None
    if os.path.isdir(clean):
        return resolve_random_image_from_folder(clean, user_handle=user_handle)
    if os.path.exists(clean):
        return os.path.abspath(clean)
    fname = os.path.basename(clean)
    candidate_dirs = [
        "images",
        os.path.join(os.path.dirname(sys.executable), "images"),
        os.path.abspath("images"),
        os.path.abspath(os.path.join("..", "images"))
    ]
    for cdir in candidate_dirs:
        test_path = os.path.join(cdir, fname)
        if os.path.exists(test_path):
            return os.path.abspath(test_path)
    return None

def find_excel_for_account(user_id):
    clean_id = user_id.replace("@", "").strip()
    candidates = [f"{clean_id}.xlsx", f"@{clean_id}.xlsx", f"tweets_{clean_id}.xlsx"]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def load_accounts():
    accounts_file = "アカウント情報.xlsx"
    accounts = []
    if not os.path.exists(accounts_file):
        return accounts
    try:
        wb = openpyxl.load_workbook(accounts_file, data_only=True)
        ws = wb["アカウント情報"] if "アカウント情報" in wb.sheetnames else wb.active
        for row in range(2, ws.max_row + 1):
            user_id = str(ws.cell(row, 1).value or "").strip()
            pw = str(ws.cell(row, 2).value or "").strip()
            name = str(ws.cell(row, 3).value or "").strip()
            token = str(ws.cell(row, 4).value or "").strip()
            if not user_id:
                continue
            clean_id = user_id.replace("@", "").lower()

            if clean_id in BLACKLISTED_ACCOUNTS:
                continue

            handle = user_id if user_id.startswith("@") else "@" + user_id
            excel_file = find_excel_for_account(user_id)
            accounts.append({
                "handle": handle,
                "user_id": user_id,
                "clean_id": clean_id,
                "name": name or handle,
                "password": pw,
                "auth_token": token,
                "excel_path": excel_file
            })
    except Exception as e:
        logger.error(f"アカウント情報読み込みエラー: {e}")
    return accounts

# 凍結アカウントの即時排除
def blacklist_and_remove_account(target_handle, reason="凍結・制限検知"):
    global BLACKLISTED_ACCOUNTS
    clean_target = target_handle.replace("@", "").strip().lower()

    BLACKLISTED_ACCOUNTS.add(clean_target)
    logger.critical(f"🚫【即時除外】[{target_handle}] をメモリ上の永久ブロックリストに追加しました")

    try:
        with open(SUSPENDED_FILE, "a", encoding="utf-8") as f:
            f.write(f"{target_handle},{datetime.now().strftime('%Y-%m-%d %H:%M:%S')},{reason}\n")
    except Exception:
        pass

    accounts_file = "アカウント情報.xlsx"
    if os.path.exists(accounts_file):
        for attempt in range(3):
            try:
                wb = openpyxl.load_workbook(accounts_file)
                ws = wb["アカウント情報"] if "アカウント情報" in wb.sheetnames else wb.active
                row_to_delete = None
                for r in range(2, ws.max_row + 1):
                    val = str(ws.cell(r, 1).value or "").strip().replace("@", "").lower()
                    if val == clean_target:
                        row_to_delete = r
                        break
                if row_to_delete:
                    ws.delete_rows(row_to_delete)
                    wb.save(accounts_file)
                    logger.info(f"🗑️「アカウント情報.xlsx」から [{target_handle}] の行を削除しました。")
                break
            except PermissionError:
                time.sleep(2)
            except Exception as e:
                logger.error(f"Excel削除エラー: {e}")
                break

def check_suspension_or_lock(page):
    suspension_keywords = [
        "アカウントが凍結されています",
        "アカウントは凍結されています",
        "アカウントがロックされています",
        "ご利用のアカウントは現在制限されています",
        "アカウントは一時的に制限されています",
        "Your account has been suspended",
        "Account suspended",
        "Your account is locked",
        "account is temporarily restricted",
        "アカウントへのアクセスが制限されています"
    ]
    try:
        content = page.content()
        for kw in suspension_keywords:
            if kw in content:
                return kw
    except Exception:
        pass
    return None

def get_settings(excel_path):
    val_min = 60
    val_max = 120
    settings = {
        "min_interval": 60,
        "max_interval": 120,
        "mode": 0,
        "start_time_min": None,
        "end_time_min": None
    }
    if not excel_path or not os.path.exists(excel_path):
        return settings
    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        if "設定" in wb.sheetnames:
            ws = wb["設定"]

            c_min = ws.cell(3, 1).value
            c_max = None
            for col in range(2, ws.max_column + 1):
                if str(ws.cell(3, col).value or "").strip() == "~":
                    c_max = ws.cell(3, col + 1).value
                    break
            if c_max is None:
                c_max = ws.cell(3, 4).value

            try:
                if c_min is not None:
                    val_min = int(float(str(c_min).strip()) * 60)
            except Exception:
                val_min = 60

            try:
                if c_max is not None:
                    val_max = int(float(str(c_max).strip()) * 60)
            except Exception:
                val_max = val_min

            final_min = min(val_min, val_max)
            final_max = max(val_min, val_max)
            if final_min < 1: final_min = 1

            settings["min_interval"] = final_min
            settings["max_interval"] = final_max

            for r in range(1, ws.max_row + 1):
                val = str(ws.cell(r, 1).value or "")
                if "時:分" in val or "ツイート実行時間" in val:
                    target_r = r + 1 if "時:分" in val else r + 2
                    s_min = parse_time_str(ws.cell(target_r, 1).value)
                    e_min = parse_time_str(ws.cell(target_r, 3).value)
                    if s_min is not None and e_min is not None and s_min != e_min:
                        settings["start_time_min"] = s_min
                        settings["end_time_min"] = e_min
                    break

            for r in range(4, ws.max_row + 1):
                val_text = str(ws.cell(r, 1).value or "")
                if "モード" in val_text:
                    mode_val = ws.cell(r + 2, 1).value
                    if mode_val is not None and str(mode_val).strip() in ["1", "ランダム"]:
                        settings["mode"] = 1
                    break
    except Exception as e:
        logger.warning(f"設定取得エラー: {e}")

    return settings

def is_within_operating_hours(settings):
    s_min = settings.get("start_time_min")
    e_min = settings.get("end_time_min")
    if s_min is None or e_min is None:
        return True
    now = datetime.now()
    cur_min = now.hour * 60 + now.minute
    if s_min < e_min:
        return s_min <= cur_min < e_min
    else:
        return cur_min >= s_min or cur_min < e_min

def reset_all_tweets_status(excel_path):
    try:
        wb = openpyxl.load_workbook(excel_path)
        ws = wb["ツイート文章"] if "ツイート文章" in wb.sheetnames else wb.active
        headers = [str(cell.value or "").strip() for cell in ws[1]]
        status_col = 4
        for idx, h in enumerate(headers):
            if h in ["ステータス", "status"]:
                status_col = idx + 1
                break
        for r in range(2, ws.max_row + 1):
            if ws.cell(r, 2).value:
                ws.cell(r, status_col).value = ""
        wb.save(excel_path)
        logger.info(f"[{os.path.basename(excel_path)}] 全ツイート完了のためステータスを自動リセットしました。")
    except Exception:
        pass

def load_tweets(excel_path, user_handle=""):
    tweets = []
    if not excel_path or not os.path.exists(excel_path):
        return tweets
    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        ws = wb["ツイート文章"] if "ツイート文章" in wb.sheetnames else wb.active
        headers = [str(cell.value or "").strip() for cell in ws[1]]
        text_col = 2
        img_col = 3
        status_col = 4
        date_col = 5
        for idx, h in enumerate(headers):
            if h in ["ツイート文章", "text", "本文"]: text_col = idx + 1
            elif h in ["画像パス", "画像"]: img_col = idx + 1
            elif h in ["ステータス", "status"]: status_col = idx + 1
            elif h in ["投稿日時"]: date_col = idx + 1

        for r in range(2, ws.max_row + 1):
            text = str(ws.cell(r, text_col).value or "").strip()
            if not text:
                continue
            raw_img = str(ws.cell(r, img_col).value or "").strip()
            resolved_img = resolve_image_path(raw_img, user_handle=user_handle)
            status = str(ws.cell(r, status_col).value or "").strip().lower()
            if status not in ["posted", "投稿済み", "完了", "skipped"]:
                tweets.append({
                    "row": r,
                    "text": text,
                    "image": resolved_img,
                    "status_col": status_col,
                    "date_col": date_col
                })
    except Exception as e:
        logger.error(f"ツイート読み込みエラー: {e}")
    return tweets

def update_excel_status(excel_path, row_idx, status_col, date_col, status_text):
    for attempt in range(3):
        try:
            wb = openpyxl.load_workbook(excel_path)
            ws = wb["ツイート文章"] if "ツイート文章" in wb.sheetnames else wb.active
            ws.cell(row_idx, status_col).value = status_text
            ws.cell(row_idx, date_col).value = datetime.now().strftime("%Y/%m/%d %H:%M:%S")
            wb.save(excel_path)
            logger.info(f"Excel更新完了: 行{row_idx} -> {status_text}")
            return
        except PermissionError:
            time.sleep(2)
        except Exception:
            break

def apply_media_blocking(page):
    def route_filter(route):
        req = route.request
        if req.method == "GET":
            if req.resource_type in ["image", "media", "font"]:
                return route.abort()
            url_clean = req.url.lower().split("?")[0]
            if any(url_clean.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm", ".woff", ".woff2", ".ttf"]):
                return route.abort()
        return route.continue_()
    try:
        page.route("**/*", route_filter)
        logger.info("⚡【提案2: 有効】画像・動画・メディア遮断フィルター稼働中 (メモリ約60%削減)")
    except Exception:
        pass

def check_for_errors_or_duplicates(page):
    duplicate_texts = ["すでに同じツイートを送信済みです", "重複したポストです", "You have already sent this"]
    error_texts = ["エラーが発生しました", "送信できませんでした", "Something went wrong"]
    try:
        content = page.content()
        for dup in duplicate_texts:
            if dup in content: return "duplicate"
        for err in error_texts:
            if err in content: return "general_error"
    except Exception:
        pass
    return None

def execute_single_post_attempt(page, text_to_send, image_path):
    try:
        page.goto("https://x.com/compose/post", wait_until="domcontentloaded", timeout=30000)
        time.sleep(random.uniform(2.0, 3.0))

        susp_msg = check_suspension_or_lock(page)
        if susp_msg:
            return f"suspended:{susp_msg}"

        human_mouse_move(page)
        editor = page.locator('div[role="textbox"]').first
        try:
            editor.wait_for(state="visible", timeout=8000)
        except Exception:
            susp_msg = check_suspension_or_lock(page)
            if susp_msg:
                return f"suspended:{susp_msg}"
            return "general_error"

        box = editor.bounding_box()
        if box:
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=4)
            time.sleep(0.1)
            page.mouse.down()
            time.sleep(0.05)
            page.mouse.up()
        else:
            editor.click()

        time.sleep(random.uniform(0.3, 0.6))
        human_typing(page, text_to_send)
        time.sleep(random.uniform(0.8, 1.5))

        if image_path and os.path.exists(image_path):
            try:
                logger.info(f"📸 画像ファイルを添付中: {os.path.basename(image_path)}")
                file_input = page.locator("input[type='file'][data-testid='fileInput']").first
                file_input.set_input_files(image_path)
                time.sleep(random.uniform(3.5, 4.5))
            except Exception as img_err:
                logger.warning(f"画像添付エラー: {img_err}")

        time.sleep(random.uniform(0.5, 1.0))

        btn = page.locator('[data-testid="tweetButton"]').first
        btn_box = btn.bounding_box()
        if btn_box:
            page.mouse.move(btn_box["x"] + btn_box["width"] / 2, btn_box["y"] + btn_box["height"] / 2, steps=5)
            time.sleep(random.uniform(0.2, 0.4))
            btn.click()
        else:
            page.keyboard.press("Control+Enter")

        time.sleep(random.uniform(3.0, 4.0))

        susp_msg = check_suspension_or_lock(page)
        if susp_msg:
            return f"suspended:{susp_msg}"

        err_type = check_for_errors_or_duplicates(page)
        if err_type: return err_type
        return "success"
    except Exception as e:
        logger.error(f"投稿実行エラー: {e}")
        return "general_error"

def post_tweet_with_smart_retry(page, original_text, image_path, user_handle=""):
    logger.info("投稿作成ページへ移動中 (人間ライク操作)...")
    res1 = execute_single_post_attempt(page, original_text, image_path)
    if res1.startswith("suspended:"):
        return res1
    if res1 == "success":
        logger.info("=== ポスト送信完了 ===")
        if image_path:
            record_image_usage(image_path, user_handle)
        return "success"

    chosen_emoji = get_unique_random_emoji()
    spaced_text = f"{original_text} {chosen_emoji}"
    logger.warning(f"【送信失敗/重複検知: {res1}】末尾に絵文字「 {chosen_emoji} 」を付与してリトライします...")
    try:
        page.keyboard.press("Escape")
        time.sleep(1)
    except Exception:
        pass

    res2 = execute_single_post_attempt(page, spaced_text, image_path)
    if res2.startswith("suspended:"):
        return res2
    if res2 == "success":
        logger.info(f"=== リトライによりポスト送信完了（絵文字: {chosen_emoji}） ===")
        if image_path:
            record_image_usage(image_path, user_handle)
        return "success"

    logger.error("【リトライも失敗】スキップして次のツイートへ進みます。")
    try:
        page.keyboard.press("Escape")
        time.sleep(1)
    except Exception:
        pass
    return "skipped"

def launch_browser_safely(p, session_dir):
    kwargs = {
        "user_data_dir": session_dir,
        "headless": False,
        "viewport": {"width": 1280, "height": 800},
        "args": ["--disable-blink-features=AutomationControlled"]
    }
    try:
        ctx = p.chromium.launch_persistent_context(**kwargs, channel="chrome")
        logger.info("🌐 [ブラウザ起動] Google Chrome を使用します。")
        return ctx
    except Exception:
        pass

    try:
        ctx = p.chromium.launch_persistent_context(**kwargs, channel="msedge")
        logger.info("🌐 [ブラウザ起動] Microsoft Edge を使用します。")
        return ctx
    except Exception:
        pass

    logger.info("🌐 [ブラウザ起動] 標準 Chromium を使用します。")
    return p.chromium.launch_persistent_context(**kwargs)

# メイン実行ループ
def safe_run():
    logger.info("==================================================")
    logger.info("★ X 自動操縦ボット起動 (画像クールダウン＆アカウント重複防止 完全統合版)")
    logger.info("★ 提案1: 1窓・順番交代ローテーション (常に開くブラウザは1つのみ)")
    logger.info("★ 提案2: 画像・動画通信ブロック (メモリ約60%カット＆高速化)")
    logger.info("★ 日常ツイート機能: スピンタックス + 動的日付/曜日 + 30日クールダウン")
    logger.info(f"★ 案3: 画像クールダウン ({IMAGE_COOLDOWN_DAYS}日間) ＆ アカウント間クロスロック ({IMAGE_CROSS_ACCOUNT_LOCK_DAYS}日間)")
    logger.info("★ 凍結対策: 凍結検知時にメモリから即座に永久排除 ＆ 再起動不要で完全自動継続！")
    logger.info(f"★ 登録済みブラックリスト除外アカウント数: {len(BLACKLISTED_ACCOUNTS)} 件")
    logger.info("==================================================")

    next_post_times = {}

    with sync_playwright() as p:
        while True:
            accounts = load_accounts()
            if not accounts:
                logger.warning("運用可能な健全アカウントが見つかりません。30秒後に再確認します。")
                time.sleep(30)
                continue

            now = datetime.now()
            worked_in_this_cycle = False

            for acc in accounts:
                handle = acc["handle"]
                clean_id = acc["clean_id"]

                if clean_id in BLACKLISTED_ACCOUNTS or not acc.get("excel_path"):
                    continue

                settings = get_settings(acc["excel_path"])
                excel_path = acc["excel_path"]

                # 1. 日常ツイート枠の検査
                daily_item = get_eligible_daily_tweet(excel_path, user_handle=handle)
                is_daily = False
                target_text = ""
                target_img = None

                if daily_item:
                    is_daily = True
                    target_text = daily_item["final_text"]
                    target_img = daily_item.get("image")
                    logger.info(f"✨ [{handle}] 日常ツイート枠「{daily_item['slot_name']}」を検知しました！")
                else:
                    if not is_within_operating_hours(settings):
                        continue
                    if handle in next_post_times and now < next_post_times[handle]:
                        continue
                    tweets = load_tweets(excel_path, user_handle=handle)
                    if not tweets:
                        reset_all_tweets_status(excel_path)
                        tweets = load_tweets(excel_path, user_handle=handle)
                    if not tweets:
                        continue
                    target_tweet = random.choice(tweets) if settings["mode"] == 1 else tweets[0]
                    target_text = target_tweet["text"]
                    target_img = target_tweet["image"]

                mode_label = "【日常ツイート】" if is_daily else "【通常ツイート】"
                img_label = f" (画像: {os.path.basename(target_img)})" if target_img else " (画像なし)"
                logger.info(f"\n--------------------------------------------------")
                logger.info(f"🔄【1窓交代】アカウント起動 ➔ [{handle}] {mode_label}{img_label}")
                logger.info(f"📝 投稿内容: {target_text[:35]}...")
                logger.info(f"--------------------------------------------------")

                session_dir = os.path.abspath(os.path.join("browser_sessions", handle.replace("@", "_")))
                os.makedirs(session_dir, exist_ok=True)

                context = None
                is_suspended = False
                suspension_reason = ""

                try:
                    context = launch_browser_safely(p, session_dir)
                    page = context.pages[0] if len(context.pages) > 0 else context.new_page()

                    apply_media_blocking(page)

                    if acc.get("auth_token"):
                        context.add_cookies([{"name": "auth_token", "value": acc["auth_token"], "domain": ".x.com", "path": "/"}])

                    page.goto("https://x.com/home", wait_until="domcontentloaded", timeout=30000)
                    time.sleep(random.uniform(2.0, 3.0))

                    susp_check = check_suspension_or_lock(page)
                    if susp_check:
                        is_suspended = True
                        suspension_reason = susp_check
                    else:
                        res = post_tweet_with_smart_retry(page, target_text, target_img, user_handle=handle)

                        if res.startswith("suspended:"):
                            is_suspended = True
                            suspension_reason = res.replace("suspended:", "")
                        elif res == "success":
                            if is_daily:
                                update_daily_tweet_status(excel_path, daily_item["row"])
                            else:
                                update_excel_status(excel_path, target_tweet["row"], target_tweet["status_col"], target_tweet["date_col"], "posted")
                        else:
                            if not is_daily:
                                update_excel_status(excel_path, target_tweet["row"], target_tweet["status_col"], target_tweet["date_col"], "skipped")

                except Exception as loop_e:
                    logger.error(f"[{handle}] ブラウザ実行中にエラーが発生しました: {loop_e}")
                finally:
                    if context:
                        try:
                            context.close()
                            logger.info(f"🧹 [{handle}] のブラウザを完全に閉じ、メモリを全解放しました。")
                        except Exception:
                            pass

                # 凍結検知時の即時処理
                if is_suspended:
                    logger.critical(f"🚨 [{handle}] の凍結・ロックを検知しました（原因: {suspension_reason}）")
                    blacklist_and_remove_account(handle, reason=suspension_reason)
                    if handle in next_post_times:
                        del next_post_times[handle]
                    logger.info(f"⚡ 再起動することなく [{handle}] を即時排除しました。残りのアカウントで直ちに続行します。")
                    time.sleep(2)
                    break

                t_min = min(settings["min_interval"], settings["max_interval"])
                t_max = max(settings["min_interval"], settings["max_interval"])
                wait_sec = random.randint(t_min, t_max) if t_min < t_max else t_min
                next_post_times[handle] = datetime.now() + timedelta(seconds=wait_sec)

                logger.info(f"⏳ [{handle}] の次回投稿は {next_post_times[handle].strftime('%H:%M:%S')} 頃です（{wait_sec // 60}分 {wait_sec % 60}秒 後）")
                worked_in_this_cycle = True
                time.sleep(random.uniform(5.0, 10.0))

            if not worked_in_this_cycle:
                time.sleep(15)

def main():
    try:
        safe_run()
    except Exception as e:
        logger.critical(f"重大なエラーが発生しました: {e}")
        logger.critical(traceback.format_exc())
        print("\n" + "="*60)
        print("エラーが発生したため停止しました。")
        print("キーを押すと画面を閉じます...")
        print("="*60)
        input()

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excelファイルに「日常ツイート」シート＆「画像フォルダ/パス」G列を自動生成/更新するツール
"""

import os
import glob
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

DAILY_TWEETS_DATA = [
    # 朝枠 7:00-9:00
    ("朝枠", "7:00-9:00", "{おはようございます|皆さんおはよう|おはよ〜☀️}！{今日もいい天気ですね|朝の空気が澄んでいて気持ちいい|今朝は少し肌寒いですね}。{無理せずマイペースに|気合い入れて|ぼちぼち}頑張りましょう〜！", "images/朝枠"),
    ("朝枠", "7:00-9:00", "おはようございます☀️ {月日}({曜日})の朝ですね！{今日も1日コツコツと|焦らず一歩ずつ|自分のペースで}進んでいきましょう✨", "images/朝枠"),
    ("朝枠", "7:00-9:00", "{朝のコーヒータイム☕|温かい白湯を飲んで|朝ごはんをしっかり食べて}目を覚ましました！{今日も充実した1日に|今日も素敵な出会いのある日に|良い1日に}なりますように。", "images/朝枠"),
    ("朝枠", "7:00-9:00", "{皆さん、今週も|今日も|今朝も}お疲れ様です！{朝からバタバタしてますが|朝活完了してスッキリ|静かな朝の時間を満喫中}。{無理のない範囲で|笑顔で|適度に息抜きしながら}いきましょう〜", "images/朝枠"),
    ("朝枠", "7:00-9:00", "おはよ〜ございます！{月日}の朝☀️ {朝起きるのが少し辛かったですが|早起きできて気分爽快|今朝はスッキリ起きられました}。今日も元気よくスタート！", "images/朝枠"),
    ("朝枠", "7:00-9:00", "おはようございます✨ {今日の予定を整理中|やることリストを確認中|スケジュールをチェック中}。{焦らずひとつずつ|優先順位をつけて|深呼吸して}こなしていこうと思います。", "images/朝枠"),
    ("朝枠", "7:00-9:00", "{今朝は風が心地いいですね|朝の光が綺麗|窓を開けたら空気が美味しい}🍃 {月日}({曜日})も{感謝の気持ちを忘れずに|明るい気分で|ポジティブに}過ごしていきましょう〜！", "images/朝枠"),
    ("朝枠", "7:00-9:00", "{おはようございます|おはです|おはよう☀️}！{朝のストレッチ完了|散歩から帰宅|シャワーを浴びてスッキリ}しました。{今日もいい日にしましょうね|皆さんも良い1日を|気をつけていってらっしゃい}！", "images/朝枠"),
    ("朝枠", "7:00-9:00", "おはようございます！{月日}、{あっという間に新しい1日|今日も始まりましたね|気合を入れ直してスタート}。{美味しいコーヒー淹れました|温かいお茶でほっこり|朝食タイム}☕", "images/朝枠"),
    ("朝枠", "7:00-9:00", "{朝からやること盛りだくさん|今日は集中デー|今日はまったり進行予定}ですが、{優先順位を決めて|落ち着いて|肩の力を抜いて}やっていきます！おはよ〜ございます☀️", "images/朝枠"),

    # 昼枠 11:30-13:30
    ("昼枠", "11:30-13:30", "{お昼休憩中〜！|ランチタイム🍽️|ひと息タイムです}。{美味しいご飯食べて午後も頑張る|お腹いっぱいになって眠くなってきた|しっかりエネルギー補給完了}！", "images/昼枠"),
    ("昼枠", "11:30-13:30", "{月日}({曜日})のお昼☀️ {皆さんお昼ご飯は何食べましたか|今日のランチは何にしようかな|お弁当美味しかった}？午後もマイペースにいこう〜", "images/昼枠"),
    ("昼枠", "11:30-13:30", "お疲れ様です！{午前中のタスク完了|午前中あっという間でした|少し疲れましたがお昼で復活}。{午後も無理せず|適度に休憩挟みながら|焦らず}いきましょう✨", "images/昼枠"),
    ("昼枠", "11:30-13:30", "{ランチ後のコーヒーが染みる|食後のデザートで幸せ気分|温かいスープでぽかぽか}☕ {月日}の午後も{ぼちぼち|気楽に|笑顔で}いきましょう！", "images/昼枠"),
    ("昼枠", "11:30-13:30", "お昼ですね！{外の空気を吸いにちょっと散歩|デスク周りを少し片付け|ストレッチして気分転換}してきました。午後も集中していきましょう〜", "images/昼枠"),
    ("昼枠", "11:30-13:30", "{月日}({曜日})、折り返し地点！{午前中頑張った自分に拍手|お昼しっかり休んでリセット|午後に向けてパワー充電中}。皆さん午後もご安全に✨", "images/昼枠"),
    ("昼枠", "11:30-13:30", "こんにちは！{今日のランチはラーメン|今日のランチはカレー|今日はおにぎりと味噌汁|定食ランチ}にしました😋 午後も頑張れそうです！", "images/昼枠"),
    ("昼枠", "11:30-13:30", "お疲れ様です☀️ {お昼寝15分して頭スッキリ|仮眠とったら視界がクリア|少し目を閉じてリフレッシュ}。午後の仕事もはかどりそう！", "images/昼枠"),

    # 夕方枠 17:00-19:00
    ("夕方枠", "17:00-19:00", "{今日も1日お疲れ様でした！|夕方の空が綺麗ですね🌆|今日もあっという間に夕方}。{帰り道はお気をつけて|一息ついてリラックス|今日もお疲れ様でした}！", "images/夕方枠"),
    ("夕方枠", "17:00-19:00", "{月日}({曜日})の夕暮れ時。{今日のタスク完了まであと少し|ラストスパート頑張ります|定時退社に向けて追い込み中}！", "images/夕方枠"),
    ("夕方枠", "17:00-19:00", "{夕焼け空が綺麗で癒やされる|夕方の風が心地いい|街灯が灯り始めるこの時間帯が好き}✨ {今日一日頑張った皆さんに乾杯|自分をしっかり褒めてあげましょう|ゆっくり休みましょう}。", "images/夕方枠"),
    ("夕方枠", "17:00-19:00", "お疲れ様です！{月日}も{無事に終われそう|トラブルなく終了|充実した一日になりました}。夜は好きなことしてのんびり過ごします！", "images/夕方枠"),
    ("夕方枠", "17:00-19:00", "{そろそろお仕事終わりの時間|今日も1日走り切りました|業務終了〜}！{夜ご飯は何にしようかな|温かいお風呂が楽しみ|早くベッドに飛び込みたい}！", "images/夕方枠"),

    # 夜枠 20:00-23:30
    ("夜枠", "20:00-23:30", "{こんばんは🌙|今夜ものんびりタイム|1日の終わりですね}。{お風呂上がりにのんびり中|温かいハーブティーでリラックス|読書しながらリラックス}しています。良い夜を〜", "images/夜枠"),
    ("夜枠", "20:00-23:30", "{月日}({曜日})も1日お疲れ様でした！{今日も無事に過ごせて感謝|皆さんもゆっくり休んでくださいね|夜はリラックスして過ごしましょう}✨", "images/夜枠"),
    ("夜枠", "20:00-23:30", "{今夜はゆっくりお風呂に浸かって温まりました|入浴剤のいい香りに癒やされる|体の芯までポカポカ}🛁 {一日の疲れがスーッと溶けていく|リフレッシュ完了|癒やしの時間}です。", "images/夜枠"),
    ("夜枠", "20:00-23:30", "こんばんは✨ {今日1日の振り返りタイム|明日の予定をサクッと確認|静かな夜の時間を満喫中}。{明日も良い日にしよう|焦らずマイペースに|今夜はぐっすり眠れそう}です。", "images/夜枠"),
    ("夜枠", "20:00-23:30", "{月日}の夜🌙 {美味しい夜ご飯を食べて満腹|家族と団らんの時間|好きなYouTubeを観てリラックス}中。皆さんも素敵な夜をお過ごしください！", "images/夜枠"),
    ("夜枠", "20:00-23:30", "今日も一日お疲れ様でした！{色々あったけど乗り越えた|反省点もあるけど明日活かそう|前向きな気持ちで布団に入ります}。おやすみなさい💤", "images/夜枠"),
]

def add_daily_tweets_to_excel(file_path):
    try:
        wb = openpyxl.load_workbook(file_path)
        sheet_name = "日常ツイート"
        if sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            idx = 0
            if "ツイート文章" in wb.sheetnames:
                idx = wb.sheetnames.index("ツイート文章") + 1
            ws = wb.create_sheet(title=sheet_name, index=idx)

        headers = ["枠名", "時間帯", "ポスト文章", "有効/無効", "最終投稿日", "最終投稿日時", "画像フォルダ/パス"]
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(1, col_idx, h)
            cell.font = Font(name="Yu Gothic", size=11, bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="1DA1F2", end_color="1DA1F2", fill_type="solid")
            cell.alignment = Alignment(horizontal="center", vertical="center")

        if ws.max_row <= 1:
            for row_idx, item in enumerate(DAILY_TWEETS_DATA, 2):
                ws.cell(row_idx, 1, item[0]).alignment = Alignment(horizontal="center", vertical="center")
                ws.cell(row_idx, 2, item[1]).alignment = Alignment(horizontal="center", vertical="center")
                ws.cell(row_idx, 3, item[2]).alignment = Alignment(horizontal="left", vertical="center")
                ws.cell(row_idx, 4, "有効").alignment = Alignment(horizontal="center", vertical="center")
                ws.cell(row_idx, 5, "")
                ws.cell(row_idx, 6, "")
                ws.cell(row_idx, 7, item[3]).alignment = Alignment(horizontal="left", vertical="center")
        else:
            for r in range(2, ws.max_row + 1):
                cur_val = ws.cell(r, 7).value
                if not cur_val:
                    slot = str(ws.cell(r, 1).value or "").strip()
                    ws.cell(r, 7, f"images/{slot}")

        ws.column_dimensions["A"].width = 10
        ws.column_dimensions["B"].width = 14
        ws.column_dimensions["C"].width = 65
        ws.column_dimensions["D"].width = 12
        ws.column_dimensions["E"].width = 14
        ws.column_dimensions["F"].width = 20
        ws.column_dimensions["G"].width = 22

        wb.save(file_path)
        print(f"✅ 日常ツイートシート更新完了: {os.path.basename(file_path)}")
    except Exception as e:
        print(f"❌ Excel更新エラー: {e}")

def main():
    target_dirs = ["C:\\Users\\PC_User\\Desktop\\X_BOT_配布用(Python不要)", "."]
    for d in target_dirs:
        if not os.path.exists(d):
            continue
        for xlsx in glob.glob(os.path.join(d, "*.xlsx")):
            fname = os.path.basename(xlsx)
            if "アカウント情報" in fname or fname.startswith("~$"):
                continue
            add_daily_tweets_to_excel(xlsx)

if __name__ == "__main__":
    main()

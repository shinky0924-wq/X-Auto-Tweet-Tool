# ========================================================
# X_AutoTweetBot 最新バージョン自動ビルド＆上書きアップデートスクリプト
# ========================================================

$ErrorActionPreference = "Continue"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "★ X_AutoTweetBot 最新版へのアップデートを開始します..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 作業ディレクトリの移動
if (Test-Path "C:\Users\PC_User\Desktop\X_BOT") {
    Set-Location "C:\Users\PC_User\Desktop\X_BOT"
}

# 1. 必要な画像フォルダ（朝枠・昼枠・夕方枠・夜枠）の自動作成
Write-Host "`n[1/4] 画像フォルダを確認・作成中..." -ForegroundColor Yellow
$imageDirs = @(
    "images\朝枠", "images\昼枠", "images\夕方枠", "images\夜枠",
    "C:\Users\PC_User\Desktop\X_BOT_配布用(Python不要)\images\朝枠",
    "C:\Users\PC_User\Desktop\X_BOT_配布用(Python不要)\images\昼枠",
    "C:\Users\PC_User\Desktop\X_BOT_配布用(Python不要)\images\夕方枠",
    "C:\Users\PC_User\Desktop\X_BOT_配布用(Python不要)\images\夜枠"
)
foreach ($d in $imageDirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "  + フォルダ作成: $d" -ForegroundColor Green
    }
}

# 2. Pythonパスの検出
$pyExe = "python"
$knownPy = "C:\Users\PC_User\AppData\Local\Programs\Python\Python312\python.exe"
if (Test-Path $knownPy) {
    $pyExe = $knownPy
}

# 3. Excelに日常ツイートシートを追加更新
Write-Host "`n[2/4] Excelファイルの日常ツイートシートを更新中..." -ForegroundColor Yellow
if (Test-Path "add_daily_tweets_excel.py") {
    & $pyExe add_daily_tweets_excel.py
}

# 4. PyInstallerでEXEを再ビルド
Write-Host "`n[3/4] 最新EXEを自動ビルド中 (PyInstaller)..." -ForegroundColor Yellow
& $pyExe -m PyInstaller `
    --noconfirm `
    --onedir `
    --console `
    --name "X_AutoTweetBot" `
    --collect-all playwright `
    --collect-all openpyxl `
    auto_tweet_playwright.py

# 5. 配布フォルダへの上書き反映
Write-Host "`n[4/4] 配布フォルダ (X_BOT_配布用(Python不要)) へ最新ファイルをコピー中..." -ForegroundColor Yellow
$distDir = "dist\X_AutoTweetBot"
$portableDir = "C:\Users\PC_User\Desktop\X_BOT_配布用(Python不要)"

if (Test-Path $distDir) {
    if (Test-Path $portableDir) {
        Copy-Item "$distDir\X_AutoTweetBot.exe" -Destination "$portableDir\X_AutoTweetBot.exe" -Force
        Copy-Item "$distDir\_internal\*" -Destination "$portableDir\_internal" -Recurse -Force
        
        # Playwrightブラウザの実体をポータブルフォルダへバックアップ配置
        $msBrowsers = "$env:LOCALAPPDATA\ms-playwright"
        $targetBrowsers = "$portableDir\_internal\playwright\driver\package\.local-browsers"
        if (Test-Path $msBrowsers) {
            New-Item -ItemType Directory -Path $targetBrowsers -Force | Out-Null
            Copy-Item "$msBrowsers\*" -Destination $targetBrowsers -Recurse -Force
        }
        
        Write-Host "✅ 配布フォルダへのコピーが完了しました！" -ForegroundColor Green
    } else {
        Write-Host "※ 配布フォルダ $portableDir は見つかりませんでした。distフォルダにEXEが生成されています。" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "【アップデート完了】最新版の更新が正常に完了しました！" -ForegroundColor Green
Write-Host "・画像クールダウン(14日)＆アカウント間重複防止(7日)を完全搭載" -ForegroundColor Green
Write-Host "・凍結アカウント即時除外＆自動継続" -ForegroundColor Green
Write-Host "・スピンタックス＆動的置換＆日常ツイート枠" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green

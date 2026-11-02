@echo off
chcp 65001 > nul
title X_AutoTweetBot
echo ===================================================
echo X (Twitter) 自動操縦ボット (最新版) を起動中...
echo ===================================================

if exist "X_AutoTweetBot.exe" (
    X_AutoTweetBot.exe
) else (
    python auto_tweet_playwright.py
)

pause

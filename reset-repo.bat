@echo off
echo ========================================================
echo GIT REPO RESET TOOL
echo ========================================================
echo WARNING: Are you SURE you already added your private key 
echo file to .gitignore? If not, close this window now!
echo ========================================================
pause

:: Set your branch name here if it's not main
set BRANCH=main

:: Grab the current remote URL BEFORE deleting the history
for /f "tokens=2" %%i in ('git remote -v ^| findstr "(fetch)"') do set REMOTE_URL=%%i

if "%REMOTE_URL%"=="" (
    echo ERROR: No remote repository found. Are you in the root directory?
    pause
    exit /b
)

echo Found remote: %REMOTE_URL%
echo Wiping history...

:: Delete local Git history completely
rmdir /S /Q .git

:: Re-initialize as a brand new repository
git init
git checkout -b %BRANCH%

:: Re-attach the remote
git remote add origin %REMOTE_URL%

:: Create a completely empty commit
git commit --allow-empty -m "Initial clean state"

:: Force push the empty commit to wipe the remote repo
git push -u --force origin %BRANCH%

:: Stage all local files (this will respect your updated .gitignore)
git add .

echo ========================================================
echo DONE!
echo - Online repo is wiped clean.
echo - Local files are untouched.
echo - Your private key was ignored (thanks to your .gitignore).
echo - Files are staged. You can now commit and push normally!
echo ========================================================
pause
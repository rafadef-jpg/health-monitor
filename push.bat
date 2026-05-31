@echo off
cd /d "%~dp0"
git config user.email "287559830+rafadef-jpg@users.noreply.github.com"
git config user.name "Rafael Defendi"
git add -A
git commit -m "feat: conquistas page + crueldade matinal reposition"
git push
echo.
echo Pronto! Pressione qualquer tecla para fechar.
pause >nul

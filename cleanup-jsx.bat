@echo off
echo Cleaning up duplicate .jsx files...

del /f /q "src\components\ui\badge.jsx"
del /f /q "src\components\ui\button.jsx"
del /f /q "src\components\ui\card.jsx"
del /f /q "src\components\ui\input.jsx"

echo Done! All duplicate .jsx files have been removed.
echo Only .tsx files will remain for TypeScript compatibility.
pause
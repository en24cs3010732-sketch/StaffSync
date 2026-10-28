@echo off
echo ========================================================
echo               Starting StaffSync HR System
echo ========================================================
echo.
start "StaffSync Server" cmd /k "cd server && npm start"
timeout /t 3 /nobreak >nul
start "StaffSync Client" cmd /k "cd client && npm run dev"
echo.
echo StaffSync is running!
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:5173
echo.

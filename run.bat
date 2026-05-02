@echo off
echo Starting Battery Health Dashboard...
echo.

:: Activate venv and start backend
start "Battery Backend" cmd /k "D:\Deep-Learning-for-Battery-State-of-Health-SoH--main\venv\Scripts\activate && cd D:\Deep-Learning-for-Battery-State-of-Health-SoH--main\Deep-Learning-for-Battery-State-of-Health-SoH--main\backend && uvicorn main:app --reload"

:: Wait for backend to start
echo Waiting for backend to start...
timeout /t 15 /nobreak

:: Open frontend in browser
start "" "D:\Deep-Learning-for-Battery-State-of-Health-SoH--main\Deep-Learning-for-Battery-State-of-Health-SoH--main\frontend\index.html"

echo.
echo Dashboard is running!
echo Close the backend window to stop the server.

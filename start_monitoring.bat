@echo off
REM Fynix Performance Monitoring Service
REM Run this to start performance monitoring

echo Starting Fynix Performance Monitor...
cd /d "C:\Users\USER\Desktop\fynix"
python performance_monitor.py --interval 60

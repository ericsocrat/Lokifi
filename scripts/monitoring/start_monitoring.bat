@echo off
REM Lokifi Performance Monitoring Service
REM Run this to start performance monitoring

echo Starting Lokifi Performance Monitor...
cd /d "C:\Users\USER\Desktop\lokifi"
python performance_monitor.py --interval 60

import re
import os

files_to_fix = [
    # Test files
    ("tests/integration/features-g2-g4.test.tsx", [
        (r"watchlists\.find\(\(w: any\)", r"watchlists.find((w: { id: string })"),
        (r"templates\.find\(\(t: any\)", r"templates.find((t: { id: string })"),
    ]),
    ("tests/stores/watchlistStore.test.tsx", [
        (r"\.find\(\(w: any\)", r".find((w: { id: string })"),
        (r"\.find\(\(item: any\)", r".find((item: { symbol: string })"),
        (r"\.filter\(\(w: any\)", r".filter((w: { id: string })"),
    ]),
    ("tests/components/multiChart.test.tsx", [
        (r"chartInstances\.map\(\(chart: any\)", r"chartInstances.map((chart: { id: string })"),
        (r"\.forEach\(\(chart: any\)", r".forEach((chart: { id: string })"),
    ]),
    ("tests/stores/multiChartStore.test.tsx", [
        (r"charts\.find\(\(c: any\)", r"charts.find((c: { id: string })"),
        (r"\.map\(\(c: any\)", r".map((c: { id: string })"),
    ]),
    
    # Components
    ("components/IndicatorSettingsDrawer.tsx", [
        (r"indicators\.map\(\(indicator: any\)", r"indicators.map((indicator: { id: string; name: string; settings: Record<string, unknown> })"),
        (r"onChange=\{\(e: any\)", r"onChange={(e: React.ChangeEvent<HTMLInputElement>)"),
    ]),
    ("components/NotificationCenter.tsx", [
        (r"notifications\.map\(\(notif: any\)", r"notifications.map((notif: { id: string; title: string; message: string; type: string; timestamp: Date })"),
        (r"onClick=\{\(e: any\)", r"onClick={(e: React.MouseEvent)"),
    ]),
    ("components/AlertsPanel.tsx", [
        (r"alerts\.map\(\(alert: any\)", r"alerts.map((alert: { id: string; name: string; condition: string; isActive: boolean })"),
        (r"onChange=\{\(e: any\)", r"onChange={(e: React.ChangeEvent<HTMLInputElement>)"),
    ]),
    ("components/DrawingToolbar.tsx", [
        (r"tools\.map\(\(tool: any\)", r"tools.map((tool: { id: string; name: string; icon: string })"),
        (r"onClick=\{\(e: any\)", r"onClick={(e: React.MouseEvent)"),
    ]),
    ("components/EnhancedSymbolPicker.tsx", [
        (r"symbols\.map\(\(symbol: any\)", r"symbols.map((symbol: { symbol: string; name: string })"),
        (r"onChange=\{\(e: any\)", r"onChange={(e: React.ChangeEvent<HTMLInputElement>)"),
    ]),
    ("components/GlobalLayout.tsx", [
        (r"routes\.map\(\(route: any\)", r"routes.map((route: { path: string; name: string })"),
        (r"onClick=\{\(e: any\)", r"onClick={(e: React.MouseEvent)"),
    ]),
    
    # Stores
    ("src/lib/stores/marketDataStore.tsx", [
        (r"\.map\(\(bar: any\)", r".map((bar: { timestamp: number; open: number; high: number; low: number; close: number; volume: number })"),
        (r"\.filter\(\(bar: any\)", r".filter((bar: { timestamp: number })"),
    ]),
    ("src/lib/stores/observabilityStore.tsx", [
        (r"logs\.map\(\(log: any\)", r"logs.map((log: { timestamp: number; level: string; message: string })"),
        (r"metrics\.map\(\(metric: any\)", r"metrics.map((metric: { name: string; value: number })"),
    ]),
    ("src/lib/stores/mobileA11yStore.tsx", [
        (r"\.map\(\(item: any\)", r".map((item: { id: string; label: string })"),
    ]),
    ("src/lib/stores/environmentManagementStore.tsx", [
        (r"environments\.map\(\(env: any\)", r"environments.map((env: { id: string; name: string })"),
    ]),
    ("src/lib/stores/paperTradingStore.tsx", [
        (r"positions\.map\(\(pos: any\)", r"positions.map((pos: { id: string; symbol: string; quantity: number })"),
    ]),
    ("src/lib/stores/pluginSettingsStore.tsx", [
        (r"settings\.map\(\(setting: any\)", r"settings.map((setting: { key: string; value: unknown })"),
    ]),
    
    # UI Components
    ("components/toast.tsx", [
        (r"toasts\.map\(\(toast: any\)", r"toasts.map((toast: { id: string; message: string; type: string })"),
    ]),
    ("components/ToastProvider.tsx", [
        (r"toasts\.map\(\(toast: any\)", r"toasts.map((toast: { id: string; message: string; type: string })"),
    ]),
]

total_eliminated = 0
files_processed = 0

for filepath, replacements in files_to_fix:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content.count(": any")
    if original == 0:
        continue
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    final = content.count(": any")
    eliminated = original - final
    total_eliminated += eliminated
    files_processed += 1
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"{filepath}: {original} -> {final} (eliminated {eliminated})")

print(f"\nTotal: {files_processed} files, {total_eliminated} any eliminated")

import re, os

fixes = {
    "components/CopilotChat.tsx": [
        (r"es\.onmessage = \(e: any\)", r"es.onmessage = (e)"),
        (r"PRESETS\.map\(\(p: any\)", r"PRESETS.map((p)"),
    ],
    "components/PluginSettingsDrawer.tsx": [
        (r"\.map\(\(x: any\) => parseFloat", r".map((x) => parseFloat"),
        (r"\.filter\(\(n: any\) => !Number\.isNaN", r".filter((n) => !Number.isNaN"),
    ],
    "components/ChartErrorBoundary.tsx": [
        (r"componentDidCatch\(error: Error, errorInfo: any\)", r"componentDidCatch(error: Error, errorInfo: React.ErrorInfo)"),
    ],
    "src/hooks/useNotifications.ts": [
        (r"prev\.map\(\(n: any\)", r"prev.map((n)"),
        (r"prev\.filter\(\(n: any\)", r"prev.filter((n)"),
        (r"notifications\.find\(\(n: any\)", r"notifications.find((n)"),
        (r"ws\.onmessage = \(event: any\)", r"ws.onmessage = (event)"),
        (r"ws\.onclose = \(event: any\)", r"ws.onclose = (event)"),
        (r"ws\.onerror = \(error: any\)", r"ws.onerror = (error)"),
    ],
    "src/state/store.ts": [
        # Remove unnecessary any in array operations where TypeScript can infer
        (r"\.map\(\(b: any\) => b\.x\)", r".map((b) => b.x)"),
        (r"\.map\(\(b: any\) => b\.y\)", r".map((b) => b.y)"),
        (r"\.forEach\(\(b: any\) => \(b\.x = alignTo\)\)", r".forEach((b) => (b.x = alignTo))"),
        (r"\.forEach\(\(b: any\) => \(b\.y = alignTo\)\)", r".forEach((b) => (b.y = alignTo))"),
        (r"\.map\(\(b: any\) => b\.x \+ b\.width\)", r".map((b) => b.x + b.width)"),
        (r"\.map\(\(b: any\) => b\.y \+ b\.height\)", r".map((b) => b.y + b.height)"),
        (r"\.forEach\(\(b: any\) => \(b\.x = alignTo - b\.width\)\)", r".forEach((b) => (b.x = alignTo - b.width))"),
        (r"\.forEach\(\(b: any\) => \(b\.y = alignTo - b\.height\)\)", r".forEach((b) => (b.y = alignTo - b.height))"),
        (r"\.find\(\(b: any\) => b\.id === d\.id\)", r".find((b) => b.id === d.id)"),
        (r"\.findIndex\(\(sd: any\) => sd\.id === d\.id\)", r".findIndex((sd) => sd.id === d.id)"),
        (r"\.map\(\(l: any\) => l\.order\)", r".map((l) => l.order)"),
        (r"\.findIndex\(\(l: any\) => l\.id === layerId\)", r".findIndex((l) => l.id === layerId)"),
        (r"layers: get\(\)\.layers\.map\(\(l: any\) =>", r"layers: get().layers.map((l) =>"),
    ],
}

total = 0
processed = []

for filepath, patterns in fixes.items():
    if not os.path.exists(filepath):
        continue
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        before = content.count(": any")
        if before == 0:
            continue
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        after = content.count(": any")
        eliminated = before - after
        if eliminated > 0:
            total += eliminated
            processed.append(f"{filepath}: {before}→{after} (-{eliminated})")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
    except Exception as e:
        print(f"ERROR {filepath}: {e}")

for p in processed:
    print(p)
print(f"\nSUCCESS: {len(processed)} files, {total} any eliminated")

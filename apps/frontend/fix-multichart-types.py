import re

with open("src/lib/stores/multiChartStore.tsx", "r", encoding="utf-8") as f:
    content = f.read()

original_count = content.count(": any")
print(f"Original: {original_count}")

# Import Draft
if "import type { Draft } from 'immer';" not in content:
    content = content.replace(
        "import { immer } from 'zustand/middleware/immer';",
        "import { immer } from 'zustand/middleware/immer';\nimport type { Draft } from 'immer';"
    )

# Replace set((state: any) =>
content = re.sub(r"set\(\(state: any\)", r"set((draft: Draft<MultiChartStore>)", content)

# Replace state. with draft. inside set callbacks
lines = content.split("\n")
result_lines = []
set_depth = 0
in_set_callback = False

for line in lines:
    if "set((draft: Draft<MultiChartStore>)" in line:
        in_set_callback = True
        set_depth = line.count("{") - line.count("}")
    elif in_set_callback:
        set_depth += line.count("{") - line.count("}")
        if "state." in line and "setState" not in line and "State" not in line:
            line = line.replace("state.", "draft.")
        if set_depth <= 0:
            in_set_callback = False
            set_depth = 0
    result_lines.append(line)

content = "\n".join(result_lines)

# Fix function parameters
content = re.sub(r"setLayout: \(layout: any\)", r"setLayout: (layout: LayoutType)", content)
content = re.sub(r"addChart: \(chartData: any\)", r"addChart: (chartData: Omit<ChartInstance, 'id'>)", content)
content = re.sub(r"removeChart: \(chartId: any\)", r"removeChart: (chartId: string)", content)
content = re.sub(r"updateChart: \(chartId: any, updates: any\)", r"updateChart: (chartId: string, updates: Partial<ChartInstance>)", content)
content = re.sub(r"setActiveChart: \(chartId: any\)", r"setActiveChart: (chartId: string | null)", content)
content = re.sub(r"updateLinking: \(dimension: any, enabled: any\)", r"updateLinking: (dimension: keyof LinkingDimensions, enabled: boolean)", content)
content = re.sub(r"changeSymbolLinked: \(symbol: any\)", r"changeSymbolLinked: (symbol: string)", content)
content = re.sub(r"changeTimeframeLinked: \(timeframe: any\)", r"changeTimeframeLinked: (timeframe: string)", content)
content = re.sub(r"updateCursorLinked: \(position: any\)", r"updateCursorLinked: (position: { time: number; price: number })", content)

# Fix arrays
content = re.sub(r"\.forEach\(\(chart: any, index: any\)", r".forEach((chart: ChartInstance, index: number)", content)
content = re.sub(r"\.filter\(\(chart: any\)", r".filter((chart: ChartInstance)", content)
content = re.sub(r"\.map\(\(chart: any\)", r".map((chart: ChartInstance)", content)
content = re.sub(r"\.map\(\(layout: any\)", r".map((layout: LayoutType)", content)
content = re.sub(r"onChange=\{\(e: any\)", r"onChange={(e: React.ChangeEvent<HTMLInputElement>)", content)

final_count = content.count(": any")
print(f"Final: {final_count}, Eliminated: {original_count - final_count}")

with open("src/lib/stores/multiChartStore.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")

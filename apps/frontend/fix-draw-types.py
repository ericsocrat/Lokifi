import re

with open("src/lib/stores/drawStore.tsx", "r", encoding="utf-8") as f:
    content = f.read()

original_count = content.count(": any")
print(f"Original: {original_count}")

# Fix listener callbacks
content = re.sub(r"listeners\.forEach\(\(l: any\)", r"listeners.forEach((l: (state: DrawState) => void)", content)

# Fix array operations with Shape type
content = re.sub(r"\.map\(\(s: any\) => \(\{ \.\.\.\(s as any\)", r".map((s: Shape) => ({ ...(s as Shape)", content)
content = re.sub(r"\.findIndex\(\(s: any\)", r".findIndex((s: Shape)", content)
content = re.sub(r"\.map\(\(s: any\)", r".map((s: Shape)", content)
content = re.sub(r"\.filter\(\(s: any\)", r".filter((s: Shape)", content)

final_count = content.count(": any")
print(f"Final: {final_count}, Eliminated: {original_count - final_count}")

with open("src/lib/stores/drawStore.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")

import time
from datetime import datetime

import whois


def check_domain_fast(domain):
    """Quick domain availability check"""
    try:
        w = whois.whois(domain)
        if w.domain_name:
            return False
    except:
        return True
    return False


# Top 50 domain names
top_50_names = [
    "vyvolt",
    "kylant",
    "kynnix",
    "thrustfin",
    "kylva",
    "flowfyn",
    "zytva",
    "vytva",
    "sparkfyn",
    "kytva",
    "vypco",
    "lokifi",
    "quartzfin",
    "vymva",
    "kymva",
    "thronefin",
    "vyppix",
    "kyppix",
    "flashfyn",
    "vyttix",
    "zyttix",
    "kyttix",
    "victoryfyn",
    "fynary",
    "treasary",
    "hadesfi",
    "kalosfin",
    "bankive",
    "saveive",
    "empirefyn",
    "rapidfyn",
    "zypherfin",
    "onefinx",
    "primefinx",
    "alphafinx",
    "crystfin",
    "achievefyn",
    "theonfin",
    "platinfin",
    "apexfyn",
    "zerofinx",
    "firstfinx",
    "crownfyn",
    "vybefin",
    "sophifi",
    "triumphfyn",
    "validfin",
    "firmafin",
    "cyberfyn",
    "digitfyn",
]

print("=" * 70)
print("TOP 50 DOMAINS - .AI AVAILABILITY CHECK")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

available = []
taken = []

for i, name in enumerate(top_50_names, 1):
    domain = f"{name}.ai"

    print(f"[{i}/50] {domain:30s} ... ", end="", flush=True)

    try:
        if check_domain_fast(domain):
            print("✅ AVAILABLE")
            available.append(domain)
        else:
            print("❌ Taken")
            taken.append(domain)
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
        break
    except Exception as e:
        print(f"⚠️ Error: {e}")
        taken.append(domain)

    time.sleep(0.5)

# Print results
print("\n" + "=" * 70)
print("📊 .AI DOMAIN RESULTS")
print("=" * 70)
print(f"Available: {len(available)}/50 ({len(available)*2}%)")
print(f"Taken: {len(taken)}/50 ({len(taken)*2}%)")

if available:
    print(f"\n✅ AVAILABLE .AI DOMAINS ({len(available)}):")
    for domain in available:
        print(f"  ✅ {domain}")
else:
    print("\n❌ NO .AI DOMAINS AVAILABLE FROM TOP 50")
    print("   All premium .ai domains are taken!")

print(f"\n{'='*70}")
print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# Save results
with open("top_50_ai_results.txt", "w") as f:
    f.write("TOP 50 DOMAINS - .AI AVAILABILITY\n")
    f.write("=" * 70 + "\n\n")
    f.write(f"Available: {len(available)}/50 ({len(available)*2}%)\n")
    f.write(f"Taken: {len(taken)}/50 ({len(taken)*2}%)\n\n")

    if available:
        f.write(f"✅ AVAILABLE .AI DOMAINS:\n")
        for domain in available:
            f.write(f"  {domain}\n")
    else:
        f.write("❌ NO .AI DOMAINS AVAILABLE\n")

    f.write(f"\n❌ TAKEN .AI DOMAINS:\n")
    for domain in taken[:20]:  # First 20
        f.write(f"  {domain}\n")
    if len(taken) > 20:
        f.write(f"  ... and {len(taken)-20} more\n")

print("\n✅ Results saved to 'top_50_ai_results.txt'")

print("\n✅ Results saved to 'top_50_ai_results.txt'")

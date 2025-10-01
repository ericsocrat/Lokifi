import time
from datetime import datetime

import whois


def check_domain(domain):
    """Check if a domain is available"""
    try:
        w = whois.whois(domain)
        if w.domain_name:
            return False
    except whois.parser.PywhoisError:
        return True
    except Exception:
        return False
    return False


# Top 50 domain names from rankings
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

# Extensions to check
extensions = [".io", ".ai"]

print("=" * 70)
print("TOP 50 DOMAINS - .IO & .AI AVAILABILITY CHECK")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

results = {".io": {"available": [], "taken": []}, ".ai": {"available": [], "taken": []}}

total_checked = 0
total_available = 0

for ext in extensions:
    print(f"\n{'='*70}")
    print(f"CHECKING {ext.upper()} DOMAINS")
    print(f"{'='*70}\n")

    available_count = 0

    for i, name in enumerate(top_50_names, 1):
        domain = f"{name}{ext}"
        total_checked += 1

        print(f"[{i}/50] {domain:30s} ... ", end="", flush=True)

        if check_domain(domain):
            print("✅ AVAILABLE")
            results[ext]["available"].append(domain)
            available_count += 1
            total_available += 1
        else:
            print("❌ Taken")
            results[ext]["taken"].append(domain)

        time.sleep(0.4)  # Rate limiting

    print(
        f"\n{ext.upper()} Summary: {available_count}/50 available ({available_count*2}%)"
    )

# Print summary
print("\n" + "=" * 70)
print("📊 FINAL RESULTS")
print("=" * 70)

for ext in extensions:
    print(f"\n{ext.upper()} DOMAINS:")
    print(
        f"Available: {len(results[ext]['available'])}/50 ({len(results[ext]['available'])*2}%)"
    )

    if results[ext]["available"]:
        print(f"\n✅ AVAILABLE {ext.upper()} DOMAINS:")
        for domain in results[ext]["available"]:
            print(f"  ✅ {domain}")
    else:
        print(f"\n❌ No {ext.upper()} domains available from top 50")

print(f"\n{'='*70}")
print(f"SUMMARY:")
print(f"Total Domains Checked: {total_checked}")
print(f"Total Available: {total_available}")
print(f"Success Rate: {(total_available/total_checked*100):.1f}%")
print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# Save results
with open("top_50_io_ai_results.txt", "w") as f:
    f.write("TOP 50 DOMAINS - .IO & .AI AVAILABILITY\n")
    f.write("=" * 70 + "\n\n")

    for ext in extensions:
        f.write(f"{ext.upper()} DOMAINS:\n")
        f.write(f"Available: {len(results[ext]['available'])}/50\n\n")

        if results[ext]["available"]:
            f.write(f"✅ AVAILABLE {ext.upper()} DOMAINS:\n")
            for domain in results[ext]["available"]:
                f.write(f"  {domain}\n")
        else:
            f.write(f"❌ No {ext.upper()} domains available\n")

        f.write("\n")

    f.write(f"\nTotal Available: {total_available}/{total_checked}\n")
    f.write(f"Success Rate: {(total_available/total_checked*100):.1f}%\n")

print("\n✅ Results saved to 'top_50_io_ai_results.txt'")

print("\n✅ Results saved to 'top_50_io_ai_results.txt'")

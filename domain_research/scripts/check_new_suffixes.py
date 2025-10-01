import time
from datetime import datetime

import whois


def check_domain(domain):
    """Check if a domain is available"""
    try:
        w = whois.whois(domain)
        # If we can get whois data, domain is likely taken
        if w.domain_name:
            return False
    except whois.parser.PywhoisError:
        # Domain not found = available
        return True
    except Exception as e:
        # Other errors, assume taken to be safe
        print(f"Error checking {domain}: {e}")
        return False
    return False


# Financial/Tech themed prefixes to test
prefixes = [
    # Greek/Latin roots
    "fin",
    "fyn",
    "bank",
    "cash",
    "pay",
    "fund",
    "vest",
    "trade",
    "asset",
    "capit",
    "wealth",
    "prosper",
    "fortune",
    "money",
    "coin",
    "token",
    "crypt",
    "block",
    "chain",
    "ledger",
    "trust",
    "secure",
    "safe",
    # Modern tech vibes
    "zy",
    "vy",
    "ky",
    "flux",
    "apex",
    "nexus",
    "vertex",
    "matrix",
    "volt",
    "spark",
    "flash",
    "swift",
    "rapid",
    "quick",
    "turbo",
    "ultra",
    "mega",
    "meta",
    "omni",
    "prime",
    "alpha",
    "beta",
    # Action words
    "grow",
    "rise",
    "soar",
    "surge",
    "boost",
    "leap",
    "jump",
    "climb",
    "scale",
    "peak",
    "summit",
    "ascend",
    "elevate",
    # Quality words
    "true",
    "real",
    "pure",
    "clear",
    "bright",
    "solid",
    "firm",
    "smart",
    "wise",
    "clever",
    "genius",
    "expert",
    "master",
    # Financial concepts
    "balance",
    "budget",
    "save",
    "invest",
    "profit",
    "yield",
    "return",
    "equity",
    "credit",
    "debit",
    "loan",
    "lease",
    # Abstract/Short
    "qy",
    "zy",
    "xy",
    "vex",
    "zex",
    "kex",
    "pyx",
    "lux",
    "nyx",
    "ryx",
    "tyx",
    "vyx",
    "zyx",
    "flux",
    "crux",
    # Single letter combinations
    "f",
    "v",
    "z",
    "k",
    "q",
    "x",
]

# Suffixes to test
suffixes = ["ance", "ix", "ax", "ut"]

print("=" * 60)
print("DOMAIN AVAILABILITY CHECKER - NEW SUFFIXES")
print(f"Checking: -ance, -ix, -ax, -ut endings")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

results = {"ance": [], "ix": [], "ax": [], "ut": []}

total_checked = 0
total_available = 0

for suffix in suffixes:
    print(f"\n{'='*60}")
    print(f"CHECKING -{suffix.upper()} DOMAINS")
    print(f"{'='*60}")

    available_count = 0

    for prefix in prefixes:
        domain = f"{prefix}{suffix}.com"
        total_checked += 1

        print(f"Checking: {domain}...", end=" ")

        if check_domain(domain):
            print("✅ AVAILABLE")
            results[suffix].append(domain)
            available_count += 1
            total_available += 1
        else:
            print("❌ Taken")

        # Rate limiting
        time.sleep(0.5)

    print(
        f"\n{suffix.upper()} Summary: {available_count} available out of {len(prefixes)} checked"
    )

# Print final results
print("\n" + "=" * 60)
print("FINAL RESULTS")
print("=" * 60)

for suffix, domains in results.items():
    print(f"\n-{suffix.upper()} Domains ({len(domains)} available):")
    if domains:
        for domain in sorted(domains):
            print(f"  ✅ {domain}")
    else:
        print("  (None available)")

print(f"\n{'='*60}")
print(f"SUMMARY:")
print(f"Total Domains Checked: {total_checked}")
print(f"Total Available: {total_available}")
print(f"Success Rate: {(total_available/total_checked*100):.1f}%")
print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# Save results to file
with open("new_suffixes_results.txt", "w") as f:
    f.write("AVAILABLE DOMAINS - NEW SUFFIXES\n")
    f.write("=" * 60 + "\n\n")

    for suffix, domains in results.items():
        f.write(f"-{suffix.upper()} Domains ({len(domains)} available):\n")
        if domains:
            for domain in sorted(domains):
                f.write(f"  {domain}\n")
        else:
            f.write("  (None available)\n")
        f.write("\n")

    f.write(f"\nTotal Available: {total_available}\n")

print("\n✅ Results saved to 'new_suffixes_results.txt'")

print("\n✅ Results saved to 'new_suffixes_results.txt'")

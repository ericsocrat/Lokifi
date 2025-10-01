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


# Creative brandable letter combinations (like Spotify, Binance style)
creative_combos = [
    # 2-3 letter combos + suffix (5-7 chars total)
    "fin",
    "fyn",
    "zyn",
    "vyn",
    "kyn",
    "ryn",
    "pyn",
    "tyn",
    "vex",
    "zex",
    "kex",
    "rex",
    "lex",
    "nex",
    "pex",
    "tex",
    "vy",
    "zy",
    "ky",
    "py",
    "ty",
    "ry",
    "ny",
    "my",
    "vo",
    "zo",
    "ko",
    "po",
    "ro",
    "no",
    "mo",
    "lo",
    "vi",
    "zi",
    "ki",
    "pi",
    "ri",
    "ni",
    "mi",
    "li",
    # 3-4 letter creative combos
    "viv",
    "ziv",
    "kiv",
    "riv",
    "piv",
    "tiv",
    "vex",
    "zex",
    "kex",
    "pex",
    "lex",
    "dex",
    "vor",
    "zor",
    "kor",
    "por",
    "tor",
    "nor",
    "val",
    "zal",
    "kal",
    "pal",
    "tal",
    "mal",
    "vyn",
    "zyn",
    "kyn",
    "pyn",
    "ryn",
    "lyn",
    # Vowel-consonant patterns
    "ava",
    "iva",
    "ova",
    "eva",
    "uva",
    "aza",
    "iza",
    "oza",
    "eza",
    "uza",
    "aka",
    "ika",
    "oka",
    "eka",
    "uka",
    "ara",
    "ira",
    "ora",
    "era",
    "ura",
    # Consonant clusters
    "bry",
    "try",
    "fry",
    "pry",
    "cry",
    "bri",
    "tri",
    "fri",
    "pri",
    "cri",
    "blo",
    "flo",
    "glo",
    "plo",
    "slo",
    "blu",
    "flu",
    "glu",
    "plu",
    "slu",
    # Tech-sounding combos
    "vyt",
    "zyt",
    "kyt",
    "pyt",
    "ryt",
    "vyp",
    "zyp",
    "kyp",
    "pyp",
    "ryp",
    "vyx",
    "zyx",
    "kyx",
    "pyx",
    "ryx",
    "vyv",
    "zyv",
    "kyv",
    "pyv",
    "ryv",
    # Smooth-sounding combos
    "lyr",
    "myr",
    "nyr",
    "syr",
    "tyr",
    "lyn",
    "myn",
    "nyn",
    "syn",
    "tyn",
    "lyv",
    "myv",
    "nyv",
    "syv",
    "tyv",
    "lyx",
    "myx",
    "nyx",
    "syx",
    "tyx",
    # Finance-inspired sounds
    "mon",
    "pon",
    "ton",
    "von",
    "zon",
    "max",
    "vax",
    "zax",
    "pax",
    "lax",
    "mix",
    "fix",
    "pix",
    "rix",
    "wix",
    "bin",
    "fin",
    "kin",
    "min",
    "pin",
    # Short punchy combos
    "qy",
    "zy",
    "xy",
    "vy",
    "ky",
    "qi",
    "zi",
    "xi",
    "vi",
    "ki",
    "qu",
    "zu",
    "xu",
    "vu",
    "ku",
    # Longer brandables
    "viva",
    "ziva",
    "kiva",
    "riva",
    "piva",
    "nova",
    "zova",
    "kova",
    "rova",
    "lova",
    "vera",
    "zera",
    "kera",
    "pera",
    "tera",
    "vita",
    "zita",
    "kita",
    "rita",
    "pita",
    # Modern tech vibes
    "flux",
    "crux",
    "prux",
    "trux",
    "drux",
    "flex",
    "plex",
    "vlex",
    "zlex",
    "klex",
    "tron",
    "vron",
    "zron",
    "kron",
    "pron",
    "trix",
    "vrix",
    "zrix",
    "krix",
    "prix",
    # Abstract sounds
    "quor",
    "zyor",
    "vyor",
    "kyor",
    "pyor",
    "quin",
    "zyin",
    "vyin",
    "kyin",
    "pyin",
    "quen",
    "zyen",
    "vyen",
    "kyen",
    "pyen",
    # Spotify/Binance style
    "spoti",
    "bina",
    "stri",
    "klari",
    "clari",
    "veri",
    "zuri",
    "kuri",
    "puri",
    "turi",
    "novi",
    "zovi",
    "kovi",
    "rovi",
    "lovi",
    "savi",
    "zavi",
    "kavi",
    "ravi",
    "lavi",
]

# Suffixes to test
suffixes = ["ance", "ix", "ax", "ut", "fy"]

print("=" * 60)
print("CREATIVE BRANDABLE DOMAIN CHECKER")
print(f"Checking: -ance, -ix, -ax, -ut, -fy endings")
print(f"Style: Spotify, Binance, etc.")
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

results = {"ance": [], "ix": [], "ax": [], "ut": [], "fy": []}

total_checked = 0
total_available = 0

for suffix in suffixes:
    print(f"\n{'='*60}")
    print(f"CHECKING -{suffix.upper()} DOMAINS")
    print(f"{'='*60}")

    available_count = 0
    checked_count = 0

    for combo in creative_combos:
        domain = f"{combo}{suffix}.com"
        total_checked += 1
        checked_count += 1

        print(f"[{checked_count}/{len(creative_combos)}] {domain}...", end=" ")

        if check_domain(domain):
            print("✅ AVAILABLE")
            results[suffix].append(domain)
            available_count += 1
            total_available += 1
        else:
            print("❌")

        time.sleep(0.3)  # Rate limiting

    print(
        f"\n✨ {suffix.upper()} Summary: {available_count}/{len(creative_combos)} available"
    )

# Print final results
print("\n" + "=" * 60)
print("🎉 AVAILABLE BRANDABLE DOMAINS")
print("=" * 60)

for suffix, domains in results.items():
    print(f"\n-{suffix.upper()} Domains ({len(domains)} available):")
    if domains:
        for domain in sorted(domains):
            print(f"  ✅ {domain}")
    else:
        print("  (None found)")

print(f"\n{'='*60}")
print(f"📊 SUMMARY:")
print(f"Total Checked: {total_checked}")
print(f"Total Available: {total_available}")
print(f"Success Rate: {(total_available/total_checked*100):.1f}%")
print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# Save results
with open("brandable_domains_results.txt", "w") as f:
    f.write("🎯 AVAILABLE BRANDABLE DOMAINS\n")
    f.write("Style: Spotify, Binance, etc.\n")
    f.write("=" * 60 + "\n\n")

    for suffix, domains in results.items():
        f.write(f"-{suffix.upper()} Domains ({len(domains)} available):\n")
        if domains:
            for domain in sorted(domains):
                f.write(f"  {domain}\n")
        f.write("\n")

    f.write(f"\nTotal Available: {total_available}\n")

print("\n✅ Results saved to 'brandable_domains_results.txt'")

print("\n✅ Results saved to 'brandable_domains_results.txt'")

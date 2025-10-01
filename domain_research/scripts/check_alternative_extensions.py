import time
from datetime import datetime

import whois


def check_domain(domain):
    """Check if a domain is available"""
    try:
        w = whois.whois(domain)
        return False  # Domain is taken
    except:
        return True  # Domain might be available


# All available .com domains we found - checking .io and .ai
base_domains = [
    # Ultra-Premium Tier
    "vyvolt",
    "kylant",
    "lokifi",
    "hadesfi",
    "thrustfi",
    "thrustfin",
    "bonanzafi",
    "bonanzafin",
    "dominatefi",
    "dominatefin",
    "sparkfyn",
    "flashfyn",
    "flowfyn",
    "kalosfi",
    "kalosfin",
    "sophifi",
    "theonfi",
    "theonfin",
    "galacfi",
    "quartzfi",
    "quartzfin",
    "crystfi",
    "crystfin",
    "platinfi",
    "platinfin",
    "zypherfi",
    "zypherfin",
    "vypherfi",
    "vypherfin",
    "succeedfi",
    "succeedfin",
    "thronefin",
    "empirefyn",
    "crownfyn",
    "vybefi",
    "vybefin",
    "vybefyn",
    "rythmfi",
    "rythmfin",
    # Mythology
    "hadesfyn",
    "zeusfyn",
    "aresfyn",
    "apollofyn",
    "hermesfyn",
    "poseidonfyn",
    "lokifyn",
    "thorfyn",
    "odinfyn",
    # Greek Concepts
    "kalosfyn",
    "sophifyn",
    "theonfyn",
    "logosfi",
    "logosfyn",
    "ethosfyn",
    "pathosfi",
    "pathosfin",
    "pathosfyn",
    # Latin Power
    "firmafi",
    "firmafin",
    "firmafyn",
    "veraxfi",
    "veraxfin",
    "veraxfyn",
    "certusfi",
    "certusfyn",
    "validfin",
    "validfyn",
    "fortisfyn",
    "solidfyn",
    # Space/Cosmic
    "galacfyn",
    "nebufin",
    "nebufyn",
    "orbitfyn",
    "lunafyn",
    "solarfyn",
    "cosmfi",
    "cosmfin",
    # Power/Energy
    "thrusfyn",
    "voltfyn",
    "chargefyn",
    "surgefyn",
    "pulsefyn",
    "forcefyn",
    "powerfyn",
    "energyfyn",
    # Speed
    "velocifyn",
    "rapidfyn",
    "swiftfyn",
    "quickfyn",
    "blazefyn",
    "dashfyn",
    "rushfyn",
    "boltfyn",
    # Action/Achievement
    "succeedfyn",
    "achievefyn",
    "victoryfyn",
    "triumphfyn",
    "championfyn",
    "winfyn",
    "movfyn",
    "sendfyn",
    "makefyn",
    "earnfyn",
    "savefyn",
    # Wealth/Fortune
    "bonanzafyn",
    "fortunefyn",
    "prosperfyn",
    "richfyn",
    "treasurefyn",
    # Modern Tech (ZY/VY/KY)
    "vyvoltfi",
    "vyvoltfin",
    "zylantfi",
    "zylantfin",
    "vylantfi",
    "vylantfin",
    "kylantfi",
    "kylantfin",
    "zycorefi",
    "zycorefin",
    "vycorefi",
    "vycorefin",
    "kycorefi",
    "kycorefin",
    "zylinkfi",
    "zylinkfin",
    "vylinkfi",
    "vylinkfin",
    "kylinkfi",
    "kylinkfin",
    "zyvoltfi",
    "zyvoltfin",
    "kyvoltfi",
    "kyvoltfin",
    "zymatfi",
    "zymatfin",
    "vymatfi",
    "vymatfin",
    "kymatfi",
    "kymatfin",
    "kypherfi",
    "kypherfin",
    # Gems/Precious
    "quartzfyn",
    "crystfyn",
    "platinfyn",
    "rubyfyn",
    "emeraldfyn",
    "diamondfyn",
    "onyxfyn",
    "amberfyn",
    "scarletfin",
    "scarletfyn",
    # Nature Elements
    "peakfyn",
    "summitfyn",
    "zenithfyn",
    "alpinefyn",
    "oceanfyn",
    "marinefyn",
    "aquafyn",
    "tidafi",
    "tidafin",
    "tidafyn",
    "wavefyn",
    "streamfyn",
    "fluxfyn",
    "currentfyn",
    # Light/Bright
    "glowfyn",
    "shinefyn",
    "beamfyn",
    "brightfyn",
    "radiantfyn",
    # Colors
    "azurefyn",
    "indigofyn",
    "violetfyn",
    "crimsonfyn",
    # Metals
    "titanfyn",
    "steelfyn",
    "ironfyn",
    "silverfyn",
    "goldfyn",
    # Animals
    "cheetafi",
    "cheetafin",
    "cheetafyn",
    "pantherfyn",
    "tigerfyn",
    "wolffyn",
    "bearfyn",
    "lionfyn",
    # Future/Intelligence
    "futurefyn",
    "tomorrowfin",
    "tomorrowfyn",
    "nextfyn",
    "aheadfin",
    "aheadfyn",
    "beyondfyn",
    "horizonfyn",
    "smartfyn",
    "cleverfyn",
    "wisefyn",
    "geniusfyn",
    "brainfyn",
    "mindfyn",
    # Security
    "securefyn",
    "safefyn",
    "shieldfyn",
    "guardfyn",
    "trustfyn",
    # Ascend/Rise
    "ascendfyn",
    "climbfin",
    "climbfyn",
    "mountfyn",
    "upliftfyn",
    "elevatefyn",
    "boostfyn",
    # Weather
    "sunfyn",
    "rainfyn",
    "windfyn",
    "snowfyn",
    "mistfin",
    "mistfyn",
    "fogfyn",
    # Growth
    "bloomfyn",
    "sproutfyn",
    "leaffyn",
    "rootfyn",
    "seedfyn",
    # Musical
    "melodyfin",
    "chordfi",
    "chordfin",
    "chordfyn",
    "ritmofin",
    "ritmofyn",
    "sonofyn",
    "beatfyn",
    "tunefyn",
    "harmonyfyn",
    # Direction
    "northfyn",
    "eastfyn",
    "westfyn",
    "southfyn",
    "compassfyn",
    "navigafin",
    "navigafyn",
    # Urban
    "metrofyn",
    "urbanfyn",
    "cityfyn",
    "townfyn",
    "plazafyn",
    "squarefyn",
    # Architecture
    "crestafi",
    "crestafin",
    "pinnafi",
    "pinnafyn",
    # Abstract/Invented
    "vynfi",
    "vynfin",
    "vynfyn",
    "kynfi",
    "kynfin",
    "zynfyn",
    "rynfin",
    "rynfyn",
    "mynfyn",
    "tynfi",
    "tynfin",
    "tynfyn",
    # Numbers
    "onefinx",
    "onefyn",
    "twofinx",
    "twofyn",
    "zerofinx",
    "zerofyn",
    "primefinx",
    "primefyn",
    "firstfinx",
    "firstfyn",
    "alphafinx",
    "alphafyn",
    # Tech Modern
    "cyberfyn",
    "digitfyn",
    "netfyn",
    "apexfyn",
    # Abstract Vowels
    "aefyn",
    "oefyn",
    "uefin",
    "uefyn",
    "iefyn",
    "yefyn",
    # Special
    "fynary",
    "treasary",
    "vypco",
    "kynnix",
    "vyppix",
    "kyppix",
    "vyttix",
    "zyttix",
    "kyttix",
    # Additional Strong Options
    "conquerfin",
    "conquerfyn",
    "reignfyn",
    "thronefyn",
    "cheddarfyn",
    "chipfyn",
    "billfyn",
    "fundfyn",
    "breadfyn",
    "doughfin",
    "doughfyn",
    "juicefyn",
    "zestfyn",
    "tangfin",
    "tangfyn",
    "spicefyn",
    "racefyn",
    "gamefyn",
    "scorefyn",
    "goalfyn",
    "aimfyn",
    "nowfyn",
    "instantfyn",
    "momentfin",
    "momentfyn",
    "epofin",
    "epofyn",
    "erafyn",
    "agefyn",
    "bridgefyn",
    "linkfyn",
    "connectfyn",
    "tiefyn",
    "bondfyn",
]


def main():
    print(
        f"Alternative Extension Check (.co, .app, .tech, .net) - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    print("=" * 80)
    print(f"Checking {len(base_domains)} domains across 4 extensions...")
    print()

    results = {
        "all_available": [],
        "three_available": [],
        "two_available": [],
        "one_available": [],
        "all_taken": [],
        "by_extension": {"co": [], "app": [], "tech": [], "net": []},
    }

    total = len(base_domains)
    count = 0

    for base in base_domains:
        count += 1
        if count % 50 == 0:
            print(f"Progress: {count}/{total} domains checked...")

        co_domain = f"{base}.co"
        app_domain = f"{base}.app"
        tech_domain = f"{base}.tech"
        net_domain = f"{base}.net"

        co_available = check_domain(co_domain)
        time.sleep(0.1)
        app_available = check_domain(app_domain)
        time.sleep(0.1)
        tech_available = check_domain(tech_domain)
        time.sleep(0.1)
        net_available = check_domain(net_domain)
        time.sleep(0.1)

        available_count = sum(
            [co_available, app_available, tech_available, net_available]
        )

        if co_available:
            results["by_extension"]["co"].append(base)
        if app_available:
            results["by_extension"]["app"].append(base)
        if tech_available:
            results["by_extension"]["tech"].append(base)
        if net_available:
            results["by_extension"]["net"].append(base)

        if available_count == 4:
            results["all_available"].append(base)
            print(f"✓✓✓✓ {base} - ALL 4 EXTENSIONS AVAILABLE!")
        elif available_count == 3:
            results["three_available"].append(
                (base, co_available, app_available, tech_available, net_available)
            )
            print(f"✓✓✓ {base} - 3 extensions available")
        elif available_count == 2:
            results["two_available"].append(
                (base, co_available, app_available, tech_available, net_available)
            )
        elif available_count == 1:
            results["one_available"].append(
                (base, co_available, app_available, tech_available, net_available)
            )
        else:
            results["all_taken"].append(base)

    print()
    print("=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    print()

    print(f"🌟 ALL 4 EXTENSIONS AVAILABLE ({len(results['all_available'])} domains):")
    print("-" * 80)
    for domain in results["all_available"]:
        print(f"  ✓ {domain}.com / .co / .app / .tech / .net")
    print()

    print(f"⭐ 3 EXTENSIONS AVAILABLE ({len(results['three_available'])} domains):")
    print("-" * 80)
    for domain, co, app, tech, net in results["three_available"]:
        exts = []
        if co:
            exts.append(".co")
        if app:
            exts.append(".app")
        if tech:
            exts.append(".tech")
        if net:
            exts.append(".net")
        print(f"  ✓ {domain}.com + {', '.join(exts)}")
    print()

    print(f"📘 2 EXTENSIONS AVAILABLE ({len(results['two_available'])} domains):")
    print("-" * 80)
    for domain, co, app, tech, net in results["two_available"][:30]:
        exts = []
        if co:
            exts.append(".co")
        if app:
            exts.append(".app")
        if tech:
            exts.append(".tech")
        if net:
            exts.append(".net")
        print(f"  ✓ {domain}.com + {', '.join(exts)}")
    if len(results["two_available"]) > 30:
        print(f"  ... and {len(results['two_available']) - 30} more")
    print()

    print("=" * 80)
    print("BY EXTENSION AVAILABILITY")
    print("=" * 80)
    print(f".co available: {len(results['by_extension']['co'])} domains")
    print(f".app available: {len(results['by_extension']['app'])} domains")
    print(f".tech available: {len(results['by_extension']['tech'])} domains")
    print(f".net available: {len(results['by_extension']['net'])} domains")
    print()

    print("=" * 80)
    print("SUMMARY STATISTICS")
    print("=" * 80)
    print(f"Total domains checked: {total}")
    print(f"All 4 extensions available: {len(results['all_available'])}")
    print(f"3 extensions available: {len(results['three_available'])}")
    print(f"2 extensions available: {len(results['two_available'])}")
    print(f"1 extension available: {len(results['one_available'])}")
    print(f"All extensions taken: {len(results['all_taken'])}")
    print()

    print(
        f".co availability rate: {(len(results['by_extension']['co'])/total)*100:.1f}%"
    )
    print(
        f".app availability rate: {(len(results['by_extension']['app'])/total)*100:.1f}%"
    )
    print(
        f".tech availability rate: {(len(results['by_extension']['tech'])/total)*100:.1f}%"
    )
    print(
        f".net availability rate: {(len(results['by_extension']['net'])/total)*100:.1f}%"
    )


if __name__ == "__main__":
    main()
if __name__ == "__main__":
    main()

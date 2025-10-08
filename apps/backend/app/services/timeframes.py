from __future__ import annotations

# Canonical set used by Lokifi UI/backend:
# 1m, 5m, 15m, 1h, 4h, 1d

CANONICAL = {"1m", "5m", "15m", "1h", "4h", "1d"}

def normalize(tf: str) -> str:
    """Normalize various aliases to canonical TFs."""
    t = tf.strip().lower().replace(" ", "")
    aliases = {
        "1": "1m", "1min": "1m", "1m": "1m",
        "5": "5m", "5min": "5m", "5m": "5m",
        "15": "15m","15min":"15m","15m":"15m",
        "60": "1h", "1h": "1h","1hr":"1h","h1":"1h",
        "240":"4h","4h":"4h","4hr":"4h","h4":"4h",
        "1d":"1d","d1":"1d","day":"1d","daily":"1d",
    }
    out = aliases.get(t, t)
    if out not in CANONICAL:
        raise ValueError(f"Unsupported timeframe: {tf}")
    return out

def seconds(tf: str) -> int:
    """Return seconds for a canonical TF."""
    tf = normalize(tf)
    return {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "1h": 3600,
        "4h": 14400,
        "1d": 86400,
    }[tf]

from collections import deque


def sma(values: list[float], period: int) -> list[float | None]:
    out, q, s = [], deque(), 0.0
    for v in values:
        q.append(v)
        s += v
        if len(q) > period:
            s -= q.popleft()
        out.append(s / period if len(q) == period else None)
    return out


def ema(values: list[float], period: int) -> list[float | None]:
    out = []
    k = 2 / (period + 1)
    ema_prev = None
    for i, v in enumerate(values):
        if ema_prev is None:
            ema_prev = v
        else:
            ema_prev = v * k + ema_prev * (1 - k)
        out.append(ema_prev if i + 1 >= period else None)
    return out


def rsi(values: list[float], period: int = 14) -> list[float | None]:
    gains = [0.0]
    losses = [0.0]
    for i in range(1, len(values)):
        diff = values[i] - values[i - 1]
        gains.append(max(diff, 0.0))
        losses.append(max(-diff, 0.0))
    # Wilder's smoothing
    avg_gain = 0.0
    avg_loss = 0.0
    out = []
    for i in range(len(values)):
        if i < period:
            out.append(None)
            continue
        if i == period:
            avg_gain = sum(gains[1 : period + 1]) / period
            avg_loss = sum(losses[1 : period + 1]) / period
        else:
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            out.append(100.0)
        else:
            rs = avg_gain / avg_loss
            out.append(100 - (100 / (1 + rs)))
    return out

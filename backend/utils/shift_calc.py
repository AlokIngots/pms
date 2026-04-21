# utils/shift_calc.py
from datetime import datetime, time

def get_shift(ts=None):
    """
    Return A, B, or C based on factory shift timings.
    A = 06:00 - 14:00
    B = 14:00 - 22:00
    C = 22:00 - 06:00
    """
    if ts is None:
        ts = datetime.now()
    t = ts.time()
    if time(6, 0) <= t < time(14, 0):
        return 'A'
    if time(14, 0) <= t < time(22, 0):
        return 'B'
    return 'C'
    
# backend/app/utils.py
import numpy as np
from typing import List, Dict

def pairwise_collision_check(states: List[Dict], threshold_km: float = 50.0):
    alerts = []
    n = len(states)
    for i in range(n):
        for j in range(i+1, n):
            a = states[i]; b = states[j]
            r1 = np.array(a["r_km"]); r2 = np.array(b["r_km"])
            dist = float(np.linalg.norm(r1 - r2))
            if dist < threshold_km:
                alerts.append({"sat1": a["name"], "sat2": b["name"], "distance_km": dist})
    return alerts

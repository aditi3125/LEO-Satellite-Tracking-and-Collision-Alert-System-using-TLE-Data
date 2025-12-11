# backend/app/propagate.py
import numpy as np
from datetime import datetime, timezone, timedelta
from math import atan2
from typing import Tuple

mu = 398600.4418  # km^3/s^2
J2 = 1.08263e-3
Re = 6378.137     # km

def tle_line2_to_elements(line2: str) -> Tuple[float,float,float,float,float,float]:
    # Parse columns from TLE line 2 (classic fixed columns)
    i = float(line2[8:16]) * np.pi/180.0
    raan = float(line2[17:25]) * np.pi/180.0
    e = float("0." + line2[26:33].strip())
    argp = float(line2[34:42]) * np.pi/180.0
    M = float(line2[43:51]) * np.pi/180.0
    n = float(line2[52:63])
    n = n * 2*np.pi / 86400.0
    a = (mu**(1/3)) / (n**(2/3))
    return a, e, i, raan, argp, M

def kepler_E(M, e, tol=1e-10):
    E = M if e < 0.8 else np.pi
    for _ in range(1000):
        f = E - e*np.sin(E) - M
        fp = 1 - e*np.cos(E)
        dE = -f / fp
        E += dE
        if abs(dE) < tol:
            break
    return E

def coe_to_rv(a, e, i, raan, argp, M):
    E = kepler_E(M, e)
    # true anomaly
    nu = 2*np.arctan2(np.sqrt(1+e)*np.sin(E/2.0), np.sqrt(1-e)*np.cos(E/2.0))
    # perifocal coordinates
    r_pf = np.array([a*(np.cos(E)-e), a*np.sqrt(1-e**2)*np.sin(E), 0.0])
    r_norm = np.linalg.norm(r_pf)
    v_pf = np.array([-np.sin(E), np.sqrt(1-e**2)*np.cos(E), 0.0]) * np.sqrt(mu*a) / r_norm
    cosO, sinO = np.cos(raan), np.sin(raan)
    cosi, sini = np.cos(i), np.sin(i)
    cosw, sinw = np.cos(argp), np.sin(argp)
    R3_O = np.array([[cosO, -sinO, 0],[sinO, cosO, 0],[0,0,1]])
    R1_i = np.array([[1,0,0],[0, cosi, -sini],[0, sini, cosi]])
    R3_w = np.array([[cosw, -sinw, 0],[sinw, cosw, 0],[0,0,1]])
    Q = R3_O @ R1_i @ R3_w
    r_eci = Q @ r_pf
    v_eci = Q @ v_pf
    return r_eci, v_eci, nu

def acceleration_with_J2(r):
    x, y, z = r
    r_norm = np.linalg.norm(r)
    a_gravity = -mu * r / r_norm**3
    z2 = z**2
    r2 = r_norm**2
    a_J2 = 1.5 * J2 * mu * (Re**2 / r_norm**5) * np.array([
        x * (5*z2/r2 - 1),
        y * (5*z2/r2 - 1),
        z * (5*z2/r2 - 3)
    ])
    return a_gravity + a_J2

def propagate_rk4_J2(r0, v0, dt, steps=1):
    r = r0.copy()
    v = v0.copy()
    h = dt / steps
    for _ in range(steps):
        k1v = acceleration_with_J2(r); k1r = v
        k2v = acceleration_with_J2(r + 0.5*h*k1r); k2r = v + 0.5*h*k1v
        k3v = acceleration_with_J2(r + 0.5*h*k2r); k3r = v + 0.5*h*k2v
        k4v = acceleration_with_J2(r + h*k3r); k4r = v + h*k3v
        r = r + (h/6.0)*(k1r + 2*k2r + 2*k3r + k4r)
        v = v + (h/6.0)*(k1v + 2*k2v + 2*k3v + k4v)
    return r, v

def julian_date(dt: datetime):
    year = dt.year; month = dt.month; day = dt.day
    hour = dt.hour + dt.minute/60 + dt.second/3600 + dt.microsecond/3.6e9
    if month <= 2:
        year -= 1; month += 12
    A = int(year/100); B = 2 - A + int(A/4)
    jd = int(365.25*(year+4716)) + int(30.6001*(month+1)) + day + B - 1524.5 + hour/24.0
    return jd

def gst_from_datetime(dt: datetime):
    jd = julian_date(dt)
    T = (jd - 2451545.0) / 36525.0
    gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933*T**2 - T**3/38710000.0
    gst = (gst % 360.0)
    return np.deg2rad(gst)

def eci_to_geodetic(r_eci, dt_utc: datetime):
    gst = gst_from_datetime(dt_utc)
    cosg, sing = np.cos(gst), np.sin(gst)
    Rz = np.array([[cosg, sing, 0], [-sing, cosg, 0], [0,0,1]])
    r_ecef = Rz @ r_eci
    x, y, z = r_ecef
    r_norm = np.linalg.norm(r_ecef)
    lat = np.arcsin(z / r_norm)
    lon = atan2(y, x)
    alt = r_norm - Re
    return np.rad2deg(lat), np.rad2deg(lon), alt*1000.0

def propagate_from_tle(name: str, line1: str, line2: str, propagate_seconds: int = 3600, samples: int = 60):
    # Parse epoch from line1 (YYDDD.DDDDDDDD) fallback to now UTC
    try:
        epoch_str = line1[18:32].strip()
        yy = int(epoch_str[0:2])
        year = 1900 + yy if yy >= 57 else 2000 + yy
        doy = float(epoch_str[2:])
        day = int(doy); frac_day = doy - day
        epoch = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=day-1) + timedelta(days=frac_day)
    except Exception:
        epoch = datetime.now(timezone.utc)

    a, e, i, raan, argp, M = tle_line2_to_elements(line2)
    r0, v0, nu0 = coe_to_rv(a, e, i, raan, argp, M)

    times = [epoch + timedelta(seconds = (propagate_seconds * k)/(samples-1) if samples>1 else 0) for k in range(samples)]
    traj = []
    for t in times:
        dt = (t - epoch).total_seconds()
        if dt == 0:
            r, v = r0.copy(), v0.copy()
        else:
            steps = max(1, int(max(1, abs(dt)) / 10))
            r, v = propagate_rk4_J2(r0, v0, dt, steps=steps)
        lat, lon, alt_m = eci_to_geodetic(r, t)
        traj.append({
            "timestamp": t.isoformat(),
            "lat": float(lat),
            "lon": float(lon),
            "alt_m": float(alt_m),
            "r_km": [float(r[0]), float(r[1]), float(r[2])],
            "v_km_s": [float(v[0]), float(v[1]), float(v[2])]
        })
    return {
        "id": name.replace(" ", "_") + "_" + str(abs(hash(line1+line2)))[0:8],
        "name": name,
        "trajectory": traj
    }

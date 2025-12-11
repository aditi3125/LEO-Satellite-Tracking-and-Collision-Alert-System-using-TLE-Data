# backend/app/main.py
import logging
import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Response, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

log = logging.getLogger("uvicorn.error")

# Attempt to import your real business logic modules; if they fail,
# we keep placeholders so the app can start for debugging.
propagate_from_tle = None
pairwise_collision_check = None
try:
    # these imports are optional — if they raise, we catch below
    from app.propagate import propagate_from_tle  # type: ignore
    from app.utils import pairwise_collision_check  # type: ignore
except Exception as e:
    log.warning("Optional import failed at startup: %s", e)
    propagate_from_tle = None
    pairwise_collision_check = None

app = FastAPI(title="LEO Propagation & Collision API", version="0.1.0")

# Allowed origins for dev. Add or modify as needed.
vite_origin = os.environ.get("VITE_DEV_ORIGIN")  # optional env override
allow_origins = [
    "http://localhost:5173",  # Vite default
    "http://127.0.0.1:5173",
    "http://localhost:8080",  # if you run frontend on 8080
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if vite_origin:
    allow_origins.append(vite_origin)

# permissive for local dev; tighten in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup_log_routes():
    routes = [getattr(r, "path", None) for r in app.routes if getattr(r, "path", None)]
    log.info("Registered routes: %s", routes)


# Simple health endpoint
@app.get("/health")
def health():
    return {"status": "ok"}


# Accept preflight OPTIONS explicitly for both possible endpoints
@app.options("/api/propagate")
def options_api_propagate():
    return Response(status_code=204)


@app.options("/propagate")
def options_propagate():
    return Response(status_code=204)


# Local Pydantic request models (used only for documentation & validation if desired)
class LocalTLE(BaseModel):
    name: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    # sometimes frontend sends tle_line1 / tle_line2:
    tle_line1: Optional[str] = None
    tle_line2: Optional[str] = None


class LocalPropagateRequest(BaseModel):
    # we accept either "tles" or "satellites"
    tles: Optional[List[LocalTLE]] = None
    satellites: Optional[List[LocalTLE]] = None
    propagate_seconds: Optional[int] = 300
    predict_seconds: Optional[int] = None
    samples: Optional[int] = 60
    sample_interval: Optional[int] = None


def _normalize_tle_item(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize incoming TLE-like dict to a canonical dict with keys:
      name, line1, line2
    Accepts variants like { tle_line1, tle_line2 } or { line1, line2 }.
    """
    name = raw.get("name") or raw.get("satellite_name") or raw.get("sat")
    line1 = raw.get("line1") or raw.get("tle_line1") or raw.get("tle1")
    line2 = raw.get("line2") or raw.get("tle_line2") or raw.get("tle2")
    return {"name": name or "UNKNOWN", "line1": line1 or "", "line2": line2 or ""}


# If user has implemented propagate_from_tle, we will call it.
# If not, we provide a small fallback mock for dev that returns a minimal trajectory.
def _call_propagator(name: str, line1: str, line2: str, propagate_seconds: int, samples: int):
    if propagate_from_tle is not None:
        try:
            # assume propagate_from_tle returns a dict like {id,name,trajectory:[{...}]}
            return propagate_from_tle(name, line1, line2, propagate_seconds, samples)
        except Exception as e:
            # DEV: show full exception in logs and include the message in the HTTP error detail
            # NOTE: This is for local debugging only — remove or redact for production.
            import traceback
            tb = traceback.format_exc()
            log.error("propagate_from_tle raised an exception: %s\n%s", e, tb)
            # Raise a 500 with the exception message so frontend sees it during development
            raise HTTPException(status_code=500, detail=f"Propagation error (server): {str(e)}")
    # fallback mock result (useful for UI development)
    mock_id = (name or "sat").replace(" ", "_") + "_mock"
    trajectory = []
    # produce a few synthetic samples (timestamps are illustrative)
    for i in range(min(3, samples or 3)):
        trajectory.append(
            {
                "timestamp": f"2030-01-01T00:00:{i:02d}Z",
                "lat": 0.0 + i * 0.1,
                "lon": 0.0 + i * 0.2,
                "alt_m": 400000 + i * 100,
                # optional orbital state vectors used by collision checks
                "r_km": [6771 + (i * 0.01), 0.0, 0.0],
                "v_km_s": [0.0, 7.5, 0.0],
            }
        )
    return {"id": mock_id, "name": name or mock_id, "trajectory": trajectory}


@app.post("/api/propagate")
@app.post("/propagate")
async def propagate_endpoint(req: Request):
    """
    Accepts multiple possible payload shapes from frontend:
    - { tles: [{name,line1,line2}, ...], propagate_seconds, samples }
    - { satellites: [{ name, tle_line1, tle_line2 }], predict_seconds, sample_interval }
    Responds with { status: "ok", results: [...], alerts: [...], collision_alerts: [...] }
    """
    try:
        raw = await req.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Extract TLE list under multiple allowed keys
    tles_raw = raw.get("tles") or raw.get("satellites") or raw.get("sat") or []
    if not isinstance(tles_raw, list):
        raise HTTPException(status_code=400, detail="`tles`/`satellites` must be an array")

    # Determine timing args with fallbacks
    propagate_seconds = (
        int(raw.get("propagate_seconds"))
        if raw.get("propagate_seconds") is not None
        else int(raw.get("predict_seconds") or 300)
    )
    # samples vs sample_interval: keep simple and interpret whichever present
    samples = None
    if raw.get("samples") is not None:
        samples = int(raw.get("samples"))
    elif raw.get("sample_interval") is not None:
        # if sample_interval present we treat it as count for backwards compat
        try:
            samples = int(raw.get("sample_interval"))
        except Exception:
            samples = 60
    else:
        samples = 60

    if not tles_raw:
        raise HTTPException(status_code=400, detail="No TLEs provided")

    results = []
    final_states = []
    for raw_item in tles_raw:
        if not isinstance(raw_item, dict):
            raw_item = dict(raw_item) if raw_item else {}
        item = _normalize_tle_item(raw_item)
        # call the propagator (either real or mock)
        sat = _call_propagator(item["name"], item["line1"], item["line2"], propagate_seconds, samples)
        results.append(sat)
        # record final state if available (for collision check)
        traj = sat.get("trajectory") or []
        if traj:
            last = traj[-1]
            final_states.append(
                {
                    "id": sat.get("id"),
                    "name": sat.get("name"),
                    "r_km": last.get("r_km"),
                    "v_km_s": last.get("v_km_s"),
                }
            )

    # collision detection: call pairwise util if available; otherwise empty
    alerts = []
    if pairwise_collision_check is not None:
        try:
            alerts = pairwise_collision_check(final_states, threshold_km=50.0)
        except Exception as e:
            log.exception("pairwise_collision_check failed: %s", e)
            alerts = []
    else:
        alerts = []  # no alerts if no checker provided

    response = {
        "status": "ok",
        "results": results,
        "alerts": alerts,
        # include both keys used across your frontend variants
        "collision_alerts": alerts,
    }
    return response


# -------------------------------
# Multipart upload endpoint (convenient for frontend)
# -------------------------------
@app.post("/upload_and_propagate")
async def upload_and_propagate(
    tle_file: UploadFile = File(...),
    propagate_seconds: int = Form(300),
    samples: int = Form(60),
):
    """
    Accepts a text file containing multiple TLEs (3 lines per satellite):
      Name
      Line1
      Line2
    Returns the same structure as /propagate.
    """
    try:
        content = await tle_file.read()
        text = content.decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {e}")

    # build tles array for reuse of existing logic
    lines = [l.strip() for l in text.splitlines() if l.strip() != ""]
    if len(lines) % 3 != 0:
        raise HTTPException(status_code=400, detail="TLE file must contain 3 lines per satellite: name, line1, line2")

    tles = []
    for i in range(0, len(lines), 3):
        tles.append({"name": lines[i], "line1": lines[i+1], "line2": lines[i+2]})

    results = []
    final_states = []
    for item in tles:
        sat = _call_propagator(item["name"], item["line1"], item["line2"], propagate_seconds, samples)
        results.append(sat)
        traj = sat.get("trajectory") or []
        if traj:
            last = traj[-1]
            final_states.append({"id": sat.get("id"), "name": sat.get("name"), "r_km": last.get("r_km"), "v_km_s": last.get("v_km_s")})
    alerts = []
    if pairwise_collision_check is not None:
        try:
            alerts = pairwise_collision_check(final_states, threshold_km=50.0)
        except Exception:
            alerts = []
    return {"status": "ok", "results": results, "alerts": alerts, "collision_alerts": alerts}


# -------------------------------
# Alert endpoint (sample-based close approach detection)
# -------------------------------
def _parse_tle_text(text: str):
    lines = [l.strip() for l in text.splitlines() if l.strip() != ""]
    if len(lines) % 3 != 0:
        raise ValueError("TLE text must contain 3 lines per satellite: name, line1, line2")
    out = []
    for i in range(0, len(lines), 3):
        out.append({"name": lines[i], "line1": lines[i+1], "line2": lines[i+2]})
    return out


def _build_trajectories_from_tles(tles_list, propagate_seconds: int, samples: int):
    results = []
    for item in tles_list:
        name = item.get("name") or item.get("sat") or "UNKNOWN"
        line1 = item.get("line1") or item.get("tle_line1") or ""
        line2 = item.get("line2") or item.get("tle_line2") or ""
        sat = _call_propagator(name, line1, line2, propagate_seconds, samples)
        results.append(sat)
    return results


def _check_close_approaches(trajectories, threshold_km: float = 50.0):
    encounters = []
    if not trajectories or len(trajectories) < 2:
        return encounters
    sample_counts = [len(t["trajectory"]) for t in trajectories]
    n_samples = min(sample_counts)
    n_sats = len(trajectories)
    import numpy as _np
    for idx in range(n_samples):
        for i in range(n_sats):
            for j in range(i+1, n_sats):
                t1 = trajectories[i]["trajectory"][idx]
                t2 = trajectories[j]["trajectory"][idx]
                r1 = t1.get("r_km")
                r2 = t2.get("r_km")
                if r1 is None or r2 is None:
                    continue
                d = float(_np.linalg.norm(_np.array(r1) - _np.array(r2)))
                if d <= threshold_km:
                    already = any(
                        e["sat1"] == trajectories[i]["name"] and e["sat2"] == trajectories[j]["name"]
                        for e in encounters
                    )
                    if not already:
                        encounters.append({
                            "sat1": trajectories[i]["name"],
                            "sat2": trajectories[j]["name"],
                            "min_distance_km": d,
                            "timestamp": t1.get("timestamp") or t2.get("timestamp"),
                            "sample_index": idx,
                            "pos1": {"r_km": t1.get("r_km"), "lat": t1.get("lat"), "lon": t1.get("lon"), "alt_m": t1.get("alt_m")},
                            "pos2": {"r_km": t2.get("r_km"), "lat": t2.get("lat"), "lon": t2.get("lon"), "alt_m": t2.get("alt_m")},
                        })
    return encounters


@app.post("/api/alert")
@app.post("/alert")
async def alert_endpoint(request: Request):
    """
    Two usage modes:
     1) JSON: POST { tles: [{name,line1,line2}, ...], propagate_seconds: int, samples: int, threshold_km: float }
     2) Multipart: POST formdata with 'tle_file' (text), 'propagate_seconds', 'samples', 'threshold_km'
    """
    content_type = request.headers.get("content-type", "")
    propagate_seconds = 300
    samples = 60
    threshold_km = 50.0

    # Multipart file upload handling
    if "multipart/form-data" in content_type:
        form = await request.form()
        tle_file = form.get("tle_file")
        if not tle_file:
            raise HTTPException(status_code=400, detail="No 'tle_file' uploaded in form-data")
        text = None
        try:
            if hasattr(tle_file, "read"):
                content = await tle_file.read()
                text = content.decode("utf-8")
            else:
                text = str(tle_file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed reading uploaded file: {e}")

        try:
            tles_list = _parse_tle_text(text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"TLE parse error: {e}")

        try:
            if form.get("propagate_seconds"):
                propagate_seconds = int(form.get("propagate_seconds"))
            if form.get("samples"):
                samples = int(form.get("samples"))
            if form.get("threshold_km"):
                threshold_km = float(form.get("threshold_km"))
        except Exception:
            pass

    else:
        try:
            raw = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
        tles_list = raw.get("tles") or raw.get("satellites") or raw.get("sat") or []
        if not isinstance(tles_list, list) or len(tles_list) == 0:
            raise HTTPException(status_code=400, detail="Provide `tles` array in JSON or upload file")
        propagate_seconds = int(raw.get("propagate_seconds") or raw.get("predict_seconds") or propagate_seconds)
        samples = int(raw.get("samples") or raw.get("sample_interval") or samples)
        threshold_km = float(raw.get("threshold_km") or threshold_km)

    try:
        trajectories = _build_trajectories_from_tles(tles_list, propagate_seconds, samples)
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Failed building trajectories for alert: %s", e)
        raise HTTPException(status_code=500, detail="Server error while propagating trajectories")

    encounters = _check_close_approaches(trajectories, threshold_km=threshold_km)
    return {"status": "ok", "trajectories": trajectories, "encounters": encounters}

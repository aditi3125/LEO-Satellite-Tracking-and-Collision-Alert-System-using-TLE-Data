import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * AlertSystem flow:
 * 1. Ask number of satellites (min 2)
 * 2. Upload exactly that many .txt TLE files (each must have: name, line1, line2)
 * 3. POST to backend /api/propagate:
 *    { tles: [{name,line1,line2}], propagate_seconds, samples, collision_threshold_km }
 * 4. Backend returns { results: [...], collision_alerts: [...] }
 * 5. Navigate to /visualize with state { results, alerts }
 */

const AlertSystem: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [satelliteCount, setSatelliteCount] = useState<number>(2);
  const [tleFiles, setTleFiles] = useState<File[]>([]);
  const [step, setStep] = useState<"count" | "upload" | "processing">("count");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadAlertHistory(session.user.id);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) loadAlertHistory(session.user.id);
    });
    return () => data?.subscription?.unsubscribe?.();
  }, [navigate]);

  const loadAlertHistory = useCallback(async (userId: string) => {
    try {
      // Adjust column names per your DB schema
      const { data, error } = await supabase
        .from("collision_alerts")
        .select("id, distance_km, alert_time, is_resolved, satellite1:satellites!collision_alerts_sat1_id(name), satellite2:satellites!collision_alerts_sat2_id(name)")
        .eq("user_id", userId)
        .order("alert_time", { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      // non-blocking: history failure shouldn't break flow
      console.warn("Failed to load alert history", err);
    }
  }, []);

  // dropzone config
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/plain": [".txt"] },
    maxFiles: satelliteCount,
    onDrop: (acceptedFiles) => {
      setTleFiles(acceptedFiles.slice(0, satelliteCount));
    },
  });

  const parseTleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) {
      throw new Error(`${file.name} invalid TLE: expected at least 3 non-empty lines (name, line1, line2)`);
    }
    return { name: lines[0], line1: lines[1], line2: lines[2] };
  };

  const handleCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Math.max(2, Math.min(10, Number(satelliteCount) || 2));
    setSatelliteCount(n);
    setStep("upload");
  };

  const handleRunAlert = async () => {
    if (tleFiles.length !== satelliteCount) {
      toast.error(`Please upload exactly ${satelliteCount} TLE file(s).`);
      return;
    }

    setIsLoading(true);
    setStep("processing");

    try {
      // parse files to payload
      const tles: { name: string; line1: string; line2: string }[] = [];
      for (const f of tleFiles) {
        const parsed = await parseTleFile(f);
        tles.push(parsed);
      }

<<<<<<< HEAD
      // payload — adapt fields to your backend implementation if needed
      const payload = {
        tles,
        propagate_seconds: 300,        // predict 5 minutes ahead by default (tweak as needed)
        samples: 60,                   // number of samples for path
        collision_threshold_km: 50,    // threshold for alerts
      };

      const res = await fetch(`${API_URL}/api/propagate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error ${res.status}: ${txt}`);
      }
      const json = await res.json();

      if (!json.results) {
        throw new Error("Invalid server response: missing results");
=======
      // Call the collision detection edge function
      const { data, error } = await supabase.functions.invoke('collision-detection', {
        body: {
          satelliteCount,
          thresholdKm: 50
        }
      });

      if (error) throw error;

      const hasCollision = data.hasCollisions;
      setHasCollisionRisk(hasCollision);

      if (hasCollision) {
        toast.error(`⚠️ COLLISION ALERT! ${data.collisionAlerts.length} proximity alert(s) detected`, {
          duration: 5000,
        });
      } else {
        toast.success(`✅ All Clear. Checked ${data.satellitesChecked} satellites - No collision risks detected`);
>>>>>>> origin/main
      }

      // Optionally save short metadata (non-blocking)
      try {
        const session = await supabase.auth.getSession();
        const userId = session.data?.session?.user?.id;
        if (userId) {
          // insert a compact alert history entries if your backend didn't persist them
          if (Array.isArray(json.collision_alerts) && json.collision_alerts.length > 0) {
            for (const a of json.collision_alerts) {
              await supabase.from("collision_alerts").insert({
                user_id: userId,
                satellite1_id: a.sat1_id ?? null,
                satellite2_id: a.sat2_id ?? null,
                distance_km: a.distance_km,
                alert_time: new Date().toISOString(),
                is_resolved: false
              } as any).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn("Supabase optional save failed", err);
      }

      toast.success("Collision check complete — opening visualizer");
      navigate("/visualize", { state: { results: json.results, alerts: json.collision_alerts || [] } });
    } catch (err: any) {
      console.error("Alert run error", err);
      toast.error(err.message || "Failed to run collision check");
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navigation />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-16">
        <Card className="max-w-2xl mx-auto p-8 bg-card/60 backdrop-blur-sm border-destructive/20">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-destructive to-orange-500 bg-clip-text text-transparent">
              Collision Alert System
            </h2>
          </div>

          {step === "count" && (
            <form onSubmit={handleCountSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="satCount">Number of Satellites to Check (min 2)</Label>
                <Input
                  id="satCount"
                  type="number"
                  min={2}
                  max={10}
                  value={satelliteCount}
                  onChange={(e) => setSatelliteCount(Math.max(2, Math.min(10, Number(e.target.value) || 2)))}
                  className="bg-background/50 border-border"
                  required
                />
                <p className="text-sm text-muted-foreground">We recommend 2–6 for quick checks; more increases compute time.</p>
              </div>

              <Button type="submit" className="w-full bg-destructive text-destructive-foreground">
                Next: Upload TLEs
              </Button>
            </form>
          )}

          {step === "upload" && (
            <div className="space-y-6">
              <div>
                <Label>Upload exactly {satelliteCount} TLE files (.txt)</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-foreground mb-1">Drag & drop TLE files here, or click to select</p>
                  <p className="text-sm text-muted-foreground">Each file must include: name (line 1), TLE line 1, TLE line 2</p>
                </div>

                {tleFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected files ({tleFiles.length}):</p>
                    {tleFiles.map((f, i) => (
                      <div key={i} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {f.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep("count")} className="flex-1">Back</Button>
                <Button onClick={handleRunAlert} disabled={isLoading || tleFiles.length !== satelliteCount} className="flex-1 bg-destructive text-destructive-foreground">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Run Alert Check"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
              <div>Processing TLEs and running collision checks — this may take a few seconds.</div>
            </div>
          )}
        </Card>

        {/* History */}
        {history && history.length > 0 && (
          <Card className="max-w-2xl mx-auto mt-8 p-6 bg-card/40 backdrop-blur-sm border-accent/20">
            <h3 className="text-lg font-bold mb-4 text-foreground">Alert History</h3>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-4 bg-background/30 rounded-lg border border-destructive/20 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      {h.satellite1?.name ?? "Sat1"} ↔ {h.satellite2?.name ?? "Sat2"}
                    </div>
                    <div className="text-sm text-muted-foreground">{new Date(h.alert_time || h.created_at || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">{(h.distance_km ?? h.distance ?? 0).toFixed(2)} km</div>
                    <div className={`px-2 py-1 rounded text-xs mt-1 ${h.is_resolved ? "bg-green-500/20 text-green-500" : "bg-destructive/20 text-destructive"}`}>
                      {h.is_resolved ? "Resolved" : "Active"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AlertSystem;

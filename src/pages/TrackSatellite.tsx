// src/pages/TrackSatellite.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Satellite, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const TrackSatellite = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [satelliteCount, setSatelliteCount] = useState<number>(1);
  const [tleFiles, setTleFiles] = useState<File[]>([]);
  const [step, setStep] = useState<"count" | "upload">("count");

  // check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => subscription?.unsubscribe && subscription.unsubscribe();
  }, [navigate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/plain": [".txt"] },
    maxFiles: satelliteCount,
    onDrop: (acceptedFiles) => {
      setTleFiles(acceptedFiles);
    },
  });

  const handleCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (satelliteCount < 1) {
      toast.error("Please enter at least 1 satellite");
      return;
    }
    setStep("upload");
  };

  // parse a single TLE file; expects 3 lines: name, line1, line2
  const parseTleFile = async (file: File) => {
    const content = await file.text();
    const lines = content
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 3)
      throw new Error(
        `Invalid TLE format in ${file.name}. Expect 3 lines: name, line1, line2.`
      );
    return {
      name: lines[0],
      tle_line1: lines[1],
      tle_line2: lines[2],
    };
  };

  // --- REPLACED: Multipart upload flow (combines uploaded files into one text blob)
  const handleUpload = async () => {
    if (tleFiles.length !== satelliteCount) {
      toast.error(`Please upload exactly ${satelliteCount} TLE file(s)`);
      return;
    }

    setIsLoading(true);

    try {
      // Combine selected files into one single text with 3 lines per sat
      let combinedText = "";
      for (const file of tleFiles) {
        const txt = await file.text();
        const lines = txt.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 3) throw new Error(`Invalid TLE in ${file.name}. Expect 3 lines.`);
        combinedText += lines.slice(0, 3).join("\n") + "\n";
      }

      const blob = new Blob([combinedText], { type: "text/plain" });
      const fileToUpload = new File([blob], "tles_combined.txt", { type: "text/plain" });

      const fd = new FormData();
      fd.append("tle_file", fileToUpload);
      fd.append("propagate_seconds", String(300));
      fd.append("samples", String(60));
      fd.append("threshold_km", String(50));

      // If you want to include auth token (optional)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${API_URL}/upload_and_propagate`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }
      const json = await res.json();
      if (!json || !Array.isArray(json.results)) {
        throw new Error("Invalid response from server");
      }

      toast.success("Propagation complete — opening visualizer");
      navigate("/visualize", { state: { results: json.results, alerts: json.collision_alerts || json.alerts || [] } });
    } catch (error: any) {
      console.error("Propagation error:", error);
      toast.error(error.message || "Failed to propagate satellites");
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
        <Card className="max-w-2xl mx-auto p-8 bg-card/60 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <Satellite className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Track Satellites
            </h2>
          </div>

          {step === "count" && (
            <form onSubmit={handleCountSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="satelliteCount">Number of Satellites to Track</Label>
                <Input
                  id="satelliteCount"
                  type="number"
                  min="1"
                  max="10"
                  value={satelliteCount}
                  onChange={(e) => setSatelliteCount(parseInt(e.target.value) || 1)}
                  className="bg-background/50 border-border focus:border-primary"
                  required
                />
                <p className="text-sm text-muted-foreground">You can track up to 10 satellites at once</p>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Next: Upload TLE Data
              </Button>
            </form>
          )}

          {step === "upload" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Upload TLE Files</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-foreground">Drop the TLE files here...</p>
                  ) : (
                    <>
                      <p className="text-foreground mb-2">Drag & drop TLE files here, or click to select</p>
                      <p className="text-sm text-muted-foreground">Upload {satelliteCount} TLE file(s) (.txt format)</p>
                    </>
                  )}
                </div>

                {tleFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Selected files:</p>
                    {tleFiles.map((file, idx) => (
                      <div key={idx} className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep("count")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isLoading || tleFiles.length !== satelliteCount}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload & Visualize"
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="max-w-2xl mx-auto mt-8 p-6 bg-card/40 backdrop-blur-sm border-accent/20">
          <h3 className="text-lg font-bold mb-3 text-foreground">TLE Format Guide</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Each TLE file should contain 3 lines:</p>
            <pre className="bg-background/50 p-3 rounded text-xs overflow-x-auto">
{`SATELLITE NAME
1 25544U 98067A   21001.00000000  .00002000  00000-0  41000-4 0  9999
2 25544  51.6400 000.0000 0000000   0.0000 000.0000 15.50000000000000`}
            </pre>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default TrackSatellite;

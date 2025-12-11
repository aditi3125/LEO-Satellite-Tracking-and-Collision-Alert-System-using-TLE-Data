// src/pages/VisualizeSatellite.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Satellite as SatelliteIcon, Loader2, TrendingUp } from "lucide-react";
import { SatelliteCard } from "@/components/SatelliteCard";
import { PredictionChart } from "@/components/PredictionChart";
import { Badge } from "@/components/ui/badge";

const VisualizeSatellite = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [satellites, setSatellites] = useState<any[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

  // 1) If results were passed via navigation state (immediate flow after upload),
  //    prefer them and populate UI instantly.
  useEffect(() => {
    const st = (location && (location as any).state) || {};
    if (st?.results && Array.isArray(st.results) && st.results.length > 0) {
      // results likely contain objects like { id, name, trajectory: [{lat,lon,alt_m,...}] }
      // Convert to a UI-friendly satellite item.
      const mapped = st.results.map((r: any, idx: number) => ({
        id: r.id || `tmp_${idx}`,
        name: r.name || r.id || `Satellite ${idx + 1}`,
        tle_line1: r.line1 || r.tle_line1 || "",
        tle_line2: r.line2 || r.tle_line2 || "",
        trajectory: r.trajectory || r.traj || [],
      }));
      setSatellites(mapped);
      setSelectedSatellite(mapped[0]);
      return;
    }
    // no state.results => fallback to DB load (below)
  }, [location]);

  // 2) Auth and DB fallback (only if we didn't already populate from state)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // if we already have satellites from state, skip DB load
      const st = (location && (location as any).state) || {};
      if (!(st?.results && Array.isArray(st.results) && st.results.length > 0)) {
        loadSatellites(session.user.id);
      }
    });
  }, [navigate, location]);

  const loadSatellites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("satellites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSatellites(data || []);
      if (data && data.length > 0) {
        setSelectedSatellite(data[0]);
        loadPredictions(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load satellites");
    }
  };

  const loadPredictions = async (satellite: any) => {
    setIsLoadingPredictions(true);
    try {
      // If the selectedSatellite already has a trajectory (from immediate results),
      // you may want to display that first — but predictions are separate.
      const { data, error } = await supabase.functions.invoke("orbital-mechanics", {
        body: {
          tleLine1: satellite.tle_line1,
          tleLine2: satellite.tle_line2,
          predictHours: 24,
        },
      });

      if (error) throw error;
      setPredictions(data.predictions || []);
      toast.success(`Generated ${data.predictions?.length ?? 0} predictions for ${satellite.name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate predictions");
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const handleSatelliteSelect = (satellite: any) => {
    setSelectedSatellite(satellite);
    // If this satellite came with a trajectory in `satellite.trajectory`, you may
    // want to show it immediately on the globe (Cesium component) — predictions are optional.
    loadPredictions(satellite);
  };

  const handleDeleteSatellite = async (id: string) => {
    try {
      const { error } = await supabase.from("satellites").delete().eq("id", id);
      if (error) throw error;

      toast.success("Satellite deleted successfully");
      setSatellites((s) => s.filter((sat) => sat.id !== id));
      if (selectedSatellite?.id === id) {
        setSelectedSatellite(null);
        setPredictions([]);
      }
    } catch (error: any) {
      toast.error("Failed to delete satellite");
    }
  };

  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-16">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/track")}
            className="text-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Satellites List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">Your Satellites</h3>
                <Badge variant="outline" className="border-primary/40">
                  {satellites.length} Total
                </Badge>
              </div>

              {satellites.length > 0 ? (
                <div className="space-y-3">
                  {satellites.map((sat) => (
                    <div
                      key={sat.id}
                      onClick={() => handleSatelliteSelect(sat)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedSatellite?.id === sat.id
                          ? "bg-primary/10 border-primary/60 shadow-[0_0_20px_rgba(96,165,250,0.3)]"
                          : "bg-background/30 border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <SatelliteIcon
                          className={`w-5 h-5 ${
                            selectedSatellite?.id === sat.id ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{sat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sat.created_at ? new Date(sat.created_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <SatelliteIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No satellites tracked yet</p>
                  <Button onClick={() => navigate("/track")} className="bg-primary hover:bg-primary/90">
                    Track New Satellite
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSatellite ? (
              <>
                <SatelliteCard satellite={selectedSatellite} onDelete={handleDeleteSatellite} />

                <Card className="p-6 bg-card/60 backdrop-blur-sm border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">Orbital Predictions</h3>
                      <p className="text-sm text-muted-foreground">
                        24-hour trajectory prediction using RK4 + J2 perturbation
                      </p>
                    </div>
                    <Button onClick={() => loadPredictions(selectedSatellite)} disabled={isLoadingPredictions}>
                      {isLoadingPredictions ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                </Card>

                {predictions.length > 0 && (
                  <>
                    <PredictionChart predictions={predictions} />

                    <Card className="p-6 bg-card/60 backdrop-blur-sm border-primary/20">
                      <h3 className="text-xl font-bold mb-4 text-foreground">Current Position</h3>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Latitude</p>
                          <p className="text-2xl font-bold text-primary">{predictions[0].latitude.toFixed(4)}°</p>
                        </div>
                        <div className="p-4 bg-secondary/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Longitude</p>
                          <p className="text-2xl font-bold text-secondary">{predictions[0].longitude.toFixed(4)}°</p>
                        </div>
                        <div className="p-4 bg-accent/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Altitude</p>
                          <p className="text-2xl font-bold text-accent">{predictions[0].altitude.toFixed(2)} km</p>
                        </div>
                        <div className="p-4 bg-purple-500/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Velocity</p>
                          <p className="text-2xl font-bold text-purple-500">{predictions[0].velocity.toFixed(2)} km/s</p>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </>
            ) : (
              <Card className="p-12 bg-card/60 backdrop-blur-sm border-primary/20">
                <div className="text-center space-y-4">
                  <SatelliteIcon className="w-20 h-20 mx-auto text-primary/40 animate-pulse" />
                  <div>
                    <p className="text-foreground text-xl font-medium mb-2">Select a Satellite</p>
                    <p className="text-muted-foreground">Choose a satellite from the list to view predictions and orbital data</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VisualizeSatellite;

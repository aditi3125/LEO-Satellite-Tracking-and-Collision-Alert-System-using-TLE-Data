<<<<<<< HEAD
// src/pages/VisualizeSatellite.tsx
import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
=======
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { supabase } from "@/integrations/supabase/client";
>>>>>>> origin/main
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
<<<<<<< HEAD
import * as Cesium from "cesium";
=======
import { ArrowLeft, Satellite as SatelliteIcon, Loader2, TrendingUp } from "lucide-react";
import { SatelliteCard } from "@/components/SatelliteCard";
import { PredictionChart } from "@/components/PredictionChart";
import { Badge } from "@/components/ui/badge";
>>>>>>> origin/main

// Ensure token is set (recommended: set VITE_CESIUM_ION_TOKEN in .env)
(Cesium as any).Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || "";

const VisualizeSatellite: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
<<<<<<< HEAD
  const cesiumRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

  const state = (location as any).state;
  const results = state?.results ?? null;
  const alerts = state?.alerts ?? [];

  useEffect(() => {
    if (!results) {
      toast.warning("No propagation data found. Please upload TLEs from Track page.");
      return;
=======
  const [user, setUser] = useState<any>(null);
  const [satellites, setSatellites] = useState<any[]>([]);
  const [selectedSatellite, setSelectedSatellite] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadSatellites(session.user.id);
    });
  }, [navigate]);

  const loadSatellites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("satellites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSatellites(data || []);

      if (data && data.length > 0 && !selectedSatellite) {
        setSelectedSatellite(data[0]);
        loadPredictions(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load satellites");
>>>>>>> origin/main
    }
    if (!cesiumRef.current) return;

<<<<<<< HEAD
    // cancelled prevents creating viewer after unmount (fixes StrictMode / race)
    let cancelled = false;

    // destroy previous viewer if exists (synchronous)
    if (viewerRef.current) {
      try {
        viewerRef.current.destroy();
      } catch (e) {
        /* ignore */
      }
      viewerRef.current = null;
    }

    // async block to allow optional async provider creation without top-level await
    (async () => {
      // if component unmounted while awaiting, stop
      if (cancelled) return;

      // ensure container is clean (remove leftover canvas/dom)
      try {
        if (cesiumRef.current) cesiumRef.current.innerHTML = "";
      } catch (e) {
        // ignore
      }

      // Build imagery and terrain providers safely (some Cesium builds expose different APIs)
      let imageryProvider: any | undefined = undefined;
      let terrainProvider: any | undefined = undefined;

      // Try IonImageryProvider (wrap in try/catch because typings / build may vary)
      try {
        const IonImageryProvider = (Cesium as any).IonImageryProvider || (Cesium as any).UrlTemplateImageryProvider;
        if (IonImageryProvider) {
          imageryProvider = new IonImageryProvider({ assetId: 3 });
        }
      } catch (err) {
        console.warn("IonImageryProvider not available or failed:", err);
        imageryProvider = undefined;
      }

      // Try createWorldTerrain() if provided, otherwise attempt CesiumTerrainProvider.fromIonAssetId
      try {
        const createWorldTerrainAny = (Cesium as any).createWorldTerrain;
        if (typeof createWorldTerrainAny === "function") {
          terrainProvider = createWorldTerrainAny();
        } else if ((Cesium as any).CesiumTerrainProvider && (Cesium as any).CesiumTerrainProvider.fromIonAssetId) {
          try {
            // some builds return provider synchronously
            terrainProvider = (Cesium as any).CesiumTerrainProvider.fromIonAssetId(1);
          } catch (terrErr) {
            console.warn("CesiumTerrainProvider.fromIonAssetId failed:", terrErr);
            terrainProvider = undefined;
          }
        }
      } catch (err) {
        console.warn("Terrain provider creation failed:", err);
        terrainProvider = undefined;
      }

      // If component unmounted while we created providers, stop
      if (cancelled) return;

      // Viewer options (loose-typed to avoid constructor typing mismatches)
      const viewerOptions: any = {
        baseLayerPicker: true,
        timeline: true,
        animation: true,
        scene3DOnly: false,
        shouldAnimate: true,
      };
      if (imageryProvider) viewerOptions.imageryProvider = imageryProvider;
      if (terrainProvider) viewerOptions.terrainProvider = terrainProvider;

      // Create viewer (use loose typing to avoid type mismatch between Cesium builds)
      try {
        const ViewerClass = (Cesium as any).Viewer || (Cesium as any).CesiumWidget;
        const viewer = new ViewerClass(cesiumRef.current as HTMLDivElement, viewerOptions);

        // if unmounted right after creation, destroy immediately and return
        if (cancelled) {
          try {
            viewer.destroy();
          } catch (_) {}
          return;
        }

        viewerRef.current = viewer;

        // Build global start/end for clock
        let globalStart: Date | null = null;
        let globalEnd: Date | null = null;

        function buildSampledPropertyAndCount(trajectory: any[] = []) {
          const prop = new (Cesium as any).SampledPositionProperty();
          let sampleCount = 0;
          for (const pt of trajectory) {
            if (!pt || !pt.timestamp || pt.lat == null || pt.lon == null || pt.alt_m == null) continue;
            const dt = new Date(pt.timestamp);
            const jd = (Cesium as any).JulianDate.fromDate(dt);
            const cart = (Cesium as any).Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt_m);
            prop.addSample(jd, cart);
            sampleCount++;
            if (!globalStart || dt < globalStart) globalStart = dt;
            if (!globalEnd || dt > globalEnd) globalEnd = dt;
          }
          return { prop, sampleCount };
        }

        // Add entities for each satellite
        for (const sat of results) {
          const { prop, sampleCount } = buildSampledPropertyAndCount(sat.trajectory || []);
          if (!prop || sampleCount === 0) {
            console.warn("No samples for sat", sat?.name ?? sat?.id);
            continue;
          }

          viewer.entities.add({
            id: sat.id,
            name: sat.name,
            position: prop as any,
            point: {
              pixelSize: 10,
              color: (Cesium as any).Color.YELLOW,
              heightReference: (Cesium as any).HeightReference.NONE,
            },
            label: {
              text: sat.name,
              font: "14px sans-serif",
              style: (Cesium as any).LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 2,
              horizontalOrigin: (Cesium as any).HorizontalOrigin.LEFT,
              pixelOffset: new (Cesium as any).Cartesian2(12, 0),
            },
            path: {
              show: true,
              leadTime: 0,
              trailTime: Number.POSITIVE_INFINITY,
              width: 2,
              material: (Cesium as any).Color.CYAN,
            },
          });
        }

        // Configure clock & timeline if we have time bounds
        if (globalStart && globalEnd) {
          const startJD = (Cesium as any).JulianDate.fromDate(globalStart);
          const endJD = (Cesium as any).JulianDate.fromDate(globalEnd);
          viewer.clock.startTime = startJD.clone();
          viewer.clock.stopTime = endJD.clone();
          viewer.clock.currentTime = startJD.clone();
          viewer.clock.clockRange = (Cesium as any).ClockRange.LOOP_STOP;
          viewer.clock.multiplier = 1;
          try {
            viewer.timeline.zoomTo(startJD, endJD);
          } catch (e) {
            // timeline may not be initialized yet; ignore
          }
        }

        // Zoom to entities
        if (viewer.entities && viewer.entities.values && viewer.entities.values.length > 0) {
          try {
            viewer.zoomTo(viewer.entities);
          } catch (e) {
            console.warn("zoomTo failed:", e);
          }
        }
      } catch (err) {
        console.error("Failed to create Cesium viewer:", err);
      }
    })();

    // cleanup: set cancelled flag and destroy viewer if present
    return () => {
      cancelled = true;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          /* ignore */
        }
        viewerRef.current = null;
      }
    };
  }, [results, navigate]);

  // If no results, show a friendly page
  if (!results) {
    return (
      <div className="min-h-screen relative">
        <StarField />
        <Navigation />
        <main className="container mx-auto pt-32 px-4">
          <Card className="p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">No propagation data</h2>
            <p className="mb-4">Please upload TLE files from the Track Satellites page to visualize trajectories.</p>
            <div className="flex gap-4">
              <Button onClick={() => navigate("/track")}>Go to Track</Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }
=======
  const loadPredictions = async (satellite: any) => {
    setIsLoadingPredictions(true);
    try {
      const { data, error } = await supabase.functions.invoke('orbital-mechanics', {
        body: {
          tleLine1: satellite.tle_line1,
          tleLine2: satellite.tle_line2,
          predictHours: 24
        }
      });

      if (error) throw error;

      setPredictions(data.predictions);
      
      // Store predictions in database
      const predictionRecords = data.predictions.slice(0, 10).map((pred: any) => ({
        user_id: user.id,
        satellite_id: satellite.id,
        prediction_time: pred.time,
        latitude: pred.latitude,
        longitude: pred.longitude,
        altitude: pred.altitude,
        velocity: pred.velocity,
        orbital_elements: pred.orbitalElements
      }));

      await supabase.from('satellite_predictions').insert(predictionRecords);

      toast.success(`Generated ${data.predictions.length} predictions for ${satellite.name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate predictions");
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const handleSatelliteSelect = (satellite: any) => {
    setSelectedSatellite(satellite);
    loadPredictions(satellite);
  };

  const handleDeleteSatellite = async (id: string) => {
    try {
      const { error } = await supabase
        .from("satellites")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Satellite deleted successfully");
      setSatellites(satellites.filter(sat => sat.id !== id));
      
      if (selectedSatellite?.id === id) {
        setSelectedSatellite(null);
        setPredictions([]);
      }
    } catch (error: any) {
      toast.error("Failed to delete satellite");
    }
  };
>>>>>>> origin/main

  // Normal render with Cesium container
  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navigation />

      {alerts && alerts.length > 0 && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="p-4 bg-red-600 text-white border-none shadow-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <div className="font-bold">Collision Alert</div>
                <div className="text-sm">
                  {alerts.map((a: any) => `${a.sat1} ↔ ${a.sat2} : ${a.distance_km.toFixed(2)} km`).join(" • ")}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-16">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/track")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Upload
          </Button>
          <h1 className="text-2xl font-bold">Satellite Visualization</h1>
        </div>

<<<<<<< HEAD
        <Card className="p-4">
          <div ref={cesiumRef} style={{ width: "100%", height: "700px" }} />
        </Card>

        <Card className="mt-6 p-4">
          <h3 className="font-bold mb-2">Satellites</h3>
          <div className="space-y-2">
            {results.map((sat: any) => (
              <div key={sat.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{sat.name}</div>
                  <div className="text-sm text-muted-foreground">Samples: {sat.trajectory?.length ?? 0}</div>
                </div>
                <div>
                  <Button
                    onClick={() => {
                      const viewer = viewerRef.current;
                      if (!viewer) return;
                      const ent = viewer.entities.getById(sat.id);
                      if (ent) viewer.flyTo(ent, { duration: 1.2 });
                    }}
                  >
                    Focus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
=======
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
                        <SatelliteIcon className={`w-5 h-5 ${
                          selectedSatellite?.id === sat.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{sat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sat.created_at).toLocaleDateString()}
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
                {/* Selected Satellite Details */}
                <SatelliteCard 
                  satellite={selectedSatellite}
                  onDelete={handleDeleteSatellite}
                />

                {/* Prediction Controls */}
                <Card className="p-6 bg-card/60 backdrop-blur-sm border-accent/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-2">Orbital Predictions</h3>
                      <p className="text-sm text-muted-foreground">
                        24-hour trajectory prediction using RK4 + J2 perturbation
                      </p>
                    </div>
                    <Button
                      onClick={() => loadPredictions(selectedSatellite)}
                      disabled={isLoadingPredictions}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
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

                {/* Predictions Chart */}
                {predictions.length > 0 && (
                  <>
                    <PredictionChart predictions={predictions} />
                    
                    {/* Current Position */}
                    <Card className="p-6 bg-card/60 backdrop-blur-sm border-primary/20">
                      <h3 className="text-xl font-bold mb-4 text-foreground">Current Position</h3>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Latitude</p>
                          <p className="text-2xl font-bold text-primary">
                            {predictions[0].latitude.toFixed(4)}°
                          </p>
                        </div>
                        <div className="p-4 bg-secondary/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Longitude</p>
                          <p className="text-2xl font-bold text-secondary">
                            {predictions[0].longitude.toFixed(4)}°
                          </p>
                        </div>
                        <div className="p-4 bg-accent/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Altitude</p>
                          <p className="text-2xl font-bold text-accent">
                            {predictions[0].altitude.toFixed(2)} km
                          </p>
                        </div>
                        <div className="p-4 bg-purple-500/10 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Velocity</p>
                          <p className="text-2xl font-bold text-purple-500">
                            {predictions[0].velocity.toFixed(2)} km/s
                          </p>
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
                    <p className="text-foreground text-xl font-medium mb-2">
                      Select a Satellite
                    </p>
                    <p className="text-muted-foreground">
                      Choose a satellite from the list to view predictions and orbital data
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
>>>>>>> origin/main
      </main>
    </div>
  );
};

export default VisualizeSatellite;

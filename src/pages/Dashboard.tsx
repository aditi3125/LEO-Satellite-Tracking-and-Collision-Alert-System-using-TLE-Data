import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Satellite, AlertTriangle, TrendingUp, Activity, MapPin } from "lucide-react";
import { SatelliteCard } from "@/components/SatelliteCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [satellites, setSatellites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadDashboardData(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadDashboardData = async (userId: string) => {
    try {
      const [profileData, satellitesData, alertsData, predictionsData] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).single(),
          supabase
            .from("satellites")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("collision_alerts")
            .select("*")
            .eq("user_id", userId)
            .eq("is_resolved", false)
            .order("created_at", { ascending: false }),
          supabase
            .from("satellite_predictions")
            .select("*, satellite:satellites(name)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      if (profileData.data) setProfile(profileData.data);
      if (satellitesData.data) setSatellites(satellitesData.data);
      if (alertsData.data) setAlerts(alertsData.data);
      if (predictionsData.data) setPredictions(predictionsData.data);
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-16">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || user.email}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-card/60 backdrop-blur-sm border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Satellite className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tracked Satellites</p>
                <p className="text-3xl font-bold text-foreground">{satellites.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/60 backdrop-blur-sm border-destructive/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-3xl font-bold text-foreground">{alerts.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/60 backdrop-blur-sm border-accent/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Predictions</p>
                <p className="text-3xl font-bold text-foreground">{predictions.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 bg-card/60 backdrop-blur-sm border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Satellite className="w-5 h-5 text-primary" />
                Your Satellites
              </h3>
              <Button
                size="sm"
                onClick={() => navigate("/visualize")}
                className="bg-primary/20 hover:bg-primary/30 text-primary"
              >
                View All
              </Button>
            </div>
            {satellites.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {satellites.slice(0, 5).map((sat) => (
                  <div
                    key={sat.id}
                    className="p-4 bg-background/30 rounded-lg border border-border hover:border-primary/40 transition-all cursor-pointer"
                    onClick={() => navigate("/visualize")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Satellite className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{sat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sat.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <MapPin className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Satellite className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground mb-4">No satellites tracked yet</p>
                <Button onClick={() => navigate("/track")} className="bg-primary hover:bg-primary/90">
                  Track Your First Satellite
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-card/60 backdrop-blur-sm border-destructive/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Collision Alerts
              </h3>
              <Button
                size="sm"
                onClick={() => navigate("/alerts")}
                className="bg-destructive/20 hover:bg-destructive/30 text-destructive"
              >
                Check Now
              </Button>
            </div>
            {alerts.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 bg-destructive/10 rounded-lg border border-destructive/40 animate-pulse-glow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-destructive">
                        ⚠️ PROXIMITY ALERT
                      </span>
                      <span className="text-xs px-2 py-1 bg-destructive/20 rounded text-destructive">
                        {alert.is_resolved ? "Resolved" : "Active"}
                      </span>
                    </div>
                    <p className="text-foreground font-medium">
                      Distance: {alert.distance.toFixed(2)} km
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.alert_time).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-green-500 font-medium mb-2">✓ All Clear</p>
                <p className="text-muted-foreground text-sm mb-4">
                  No collision risks detected
                </p>
                <Button
                  onClick={() => navigate("/alerts")}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Run Collision Check
                </Button>
              </div>
            )}
          </Card>
        </div>

        {predictions.length > 0 && (
          <Card className="mt-6 p-6 bg-card/60 backdrop-blur-sm border-accent/20">
            <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Recent Predictions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="pb-2 text-muted-foreground">Satellite</th>
                    <th className="pb-2 text-muted-foreground">Latitude</th>
                    <th className="pb-2 text-muted-foreground">Longitude</th>
                    <th className="pb-2 text-muted-foreground">Altitude (km)</th>
                    <th className="pb-2 text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred: any) => (
                    <tr key={pred.id} className="border-b border-border/50">
                      <td className="py-2 text-foreground">{pred.satellite?.name}</td>
                      <td className="py-2 text-muted-foreground">
                        {pred.latitude.toFixed(4)}°
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {pred.longitude.toFixed(4)}°
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {pred.altitude.toFixed(2)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(pred.prediction_time).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

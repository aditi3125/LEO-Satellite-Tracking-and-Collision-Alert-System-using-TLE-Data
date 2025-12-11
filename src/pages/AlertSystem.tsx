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
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

const AlertSystem = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [satelliteCount, setSatelliteCount] = useState<number>(2);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hasCollisionRisk, setHasCollisionRisk] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadAlerts(session.user.id);
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

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadAlerts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("collision_alerts")
        .select("*, satellite1:satellites!satellite1_id(name), satellite2:satellites!satellite2_id(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast.error("Failed to load alerts");
    }
  };

  const handleCheckCollisions = async () => {
    if (satelliteCount < 2) {
      toast.error("Please enter at least 2 satellites to check for collisions");
      return;
    }

    setIsChecking(true);
    setIsLoading(true);

    try {
      const { data: satellites, error: satError } = await supabase
        .from("satellites")
        .select("*")
        .eq("user_id", user.id)
        .limit(satelliteCount);

      if (satError) throw satError;

      if (!satellites || satellites.length < 2) {
        toast.error(`You need at least ${satelliteCount} satellites uploaded to check for collisions`);
        setIsLoading(false);
        return;
      }

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
      }

      setTimeout(() => {
        loadAlerts(user.id);
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to check collisions");
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

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="satelliteCount">Number of Satellites to Monitor</Label>
              <Input
                id="satelliteCount"
                type="number"
                min="2"
                max="10"
                value={satelliteCount}
                onChange={(e) => setSatelliteCount(parseInt(e.target.value) || 2)}
                className="bg-background/50 border-border focus:border-destructive"
                required
              />
              <p className="text-sm text-muted-foreground">
                Minimum 2 satellites required for collision detection (threshold: 50 km)
              </p>
            </div>

            <Button
              onClick={handleCheckCollisions}
              disabled={isLoading || satelliteCount < 2}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Collisions...
                </>
              ) : (
                "Activate Alert System"
              )}
            </Button>
          </div>

          {isChecking && hasCollisionRisk !== null && (
            <Card
              className={`mt-6 p-6 ${
                hasCollisionRisk
                  ? "bg-destructive/10 border-destructive/40"
                  : "bg-green-500/10 border-green-500/40"
              }`}
            >
              <div className="flex items-start gap-4">
                {hasCollisionRisk ? (
                  <AlertTriangle className="w-12 h-12 text-destructive flex-shrink-0 animate-pulse" />
                ) : (
                  <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                )}
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {hasCollisionRisk ? "⚠️ COLLISION ALERT!" : "✅ All Clear"}
                  </h3>
                  <p className="text-muted-foreground">
                    {hasCollisionRisk
                      ? "Potential collision detected! Satellites are within 50 km proximity."
                      : "No collision risks detected. All satellites are at safe distances."}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </Card>

        {alerts.length > 0 && (
          <Card className="max-w-2xl mx-auto mt-8 p-6 bg-card/40 backdrop-blur-sm border-accent/20">
            <h3 className="text-lg font-bold mb-4 text-foreground">Alert History</h3>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 bg-background/30 rounded-lg border border-destructive/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        Distance: {alert.distance.toFixed(2)} km
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(alert.alert_time).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-sm ${
                        alert.is_resolved
                          ? "bg-green-500/20 text-green-500"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {alert.is_resolved ? "Resolved" : "Active"}
                    </span>
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

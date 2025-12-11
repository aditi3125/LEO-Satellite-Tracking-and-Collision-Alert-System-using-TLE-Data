import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Satellite, AlertTriangle, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTrackSatellite = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/track");
  };

  const handleAlertSystem = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/alerts");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />
      
      {/* Orbital rings background effect */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-primary/30 animate-[spin_60s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-secondary/20 animate-[spin_45s_linear_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-accent/20 animate-[spin_30s_linear_infinite]" />
      </div>

      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <div className="text-center max-w-6xl mx-auto mb-20">
          <div className="inline-block mb-6 px-6 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm animate-fade-in">
            <span className="text-primary text-sm font-semibold tracking-wider">ADVANCED ORBITAL TRACKING SYSTEM</span>
          </div>
          
          <h1 className="text-7xl md:text-8xl font-bold mb-8 leading-tight">
            <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-float">
              LEO Satellite
            </span>
            <span className="block bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent animate-float" style={{ animationDelay: '0.2s' }}>
              Tracking System
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Track Low Earth Orbit satellites in real-time using TLE data and predict potential collisions with advanced orbital mechanics powered by RK4 + J2 perturbation algorithms
          </p>
          
          {!user && (
            <Card className="p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md border-primary/30 mb-8 max-w-md mx-auto shadow-[0_0_40px_rgba(96,165,250,0.15)] animate-scale-in">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow">
                  <Info className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-foreground font-medium">
                Please log in to access satellite tracking and collision alert features
              </p>
            </Card>
          )}

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
            <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all hover:scale-105">
              <div className="text-4xl font-bold text-primary mb-2">3D</div>
              <div className="text-sm text-muted-foreground">Visualization</div>
            </div>
            <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border border-secondary/20 hover:border-secondary/40 transition-all hover:scale-105">
              <div className="text-4xl font-bold text-secondary mb-2">50km</div>
              <div className="text-sm text-muted-foreground">Alert Threshold</div>
            </div>
            <div className="p-6 rounded-xl bg-card/40 backdrop-blur-sm border border-accent/20 hover:border-accent/40 transition-all hover:scale-105">
              <div className="text-4xl font-bold text-accent mb-2">Real-time</div>
              <div className="text-sm text-muted-foreground">Tracking</div>
            </div>
          </div>
        </div>

        {/* Main Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-20">
          <Card 
            className="group relative overflow-hidden p-8 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md border-primary/30 hover:border-primary/60 transition-all duration-500 cursor-pointer hover:scale-[1.02] shadow-[0_0_40px_rgba(96,165,250,0.1)] hover:shadow-[0_0_60px_rgba(96,165,250,0.3)]"
            onClick={handleTrackSatellite}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Animated orbital ring */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full border-2 border-primary/20 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-glow" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/40 group-hover:border-primary/60 group-hover:scale-110 transition-all duration-500">
                  <Satellite className="w-12 h-12 text-primary group-hover:rotate-12 transition-transform duration-500" />
                </div>
              </div>
              
              <h2 className="text-4xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors">
                Track Satellite
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                Upload TLE data and visualize satellite orbits in stunning 3D. View real-time positions, orbital elements, and predicted trajectories with precision.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(96,165,250,0.3)] hover:shadow-[0_0_30px_rgba(96,165,250,0.5)] transition-all duration-300 py-6 text-lg font-semibold">
                Start Tracking →
              </Button>
            </div>
          </Card>

          <Card 
            className="group relative overflow-hidden p-8 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md border-destructive/30 hover:border-destructive/60 transition-all duration-500 cursor-pointer hover:scale-[1.02] shadow-[0_0_40px_rgba(239,68,68,0.1)] hover:shadow-[0_0_60px_rgba(239,68,68,0.3)]"
            onClick={handleAlertSystem}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Animated warning pulse */}
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-destructive/10 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse-glow" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center border-2 border-destructive/40 group-hover:border-destructive/60 group-hover:scale-110 transition-all duration-500">
                  <AlertTriangle className="w-12 h-12 text-destructive group-hover:scale-110 animate-pulse transition-transform duration-500" />
                </div>
              </div>
              
              <h2 className="text-4xl font-bold mb-4 text-foreground group-hover:text-destructive transition-colors">
                Collision Alert System
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                Monitor multiple satellites simultaneously and receive automatic alerts when any two satellites come within 50 km of each other.
              </p>
              <Button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all duration-300 py-6 text-lg font-semibold">
                Activate Alerts →
              </Button>
            </div>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Powerful Features
            </h3>
            <p className="text-muted-foreground text-lg">
              Everything you need for advanced satellite tracking and collision prediction
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-card/40 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.2)]">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 rounded-full bg-primary" />
              </div>
              <h4 className="text-xl font-bold mb-2 text-foreground">3D Visualization</h4>
              <p className="text-muted-foreground">Real-time 3D rendering using Cesium.js for immersive orbital tracking</p>
            </Card>

            <Card className="p-6 bg-card/40 backdrop-blur-sm border-secondary/20 hover:border-secondary/40 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]">
              <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 rounded-full bg-secondary" />
              </div>
              <h4 className="text-xl font-bold mb-2 text-foreground">Advanced Mechanics</h4>
              <p className="text-muted-foreground">RK4 numerical integration with J2 gravitational perturbation modeling</p>
            </Card>

            <Card className="p-6 bg-card/40 backdrop-blur-sm border-accent/20 hover:border-accent/40 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 rounded-full bg-accent" />
              </div>
              <h4 className="text-xl font-bold mb-2 text-foreground">TLE Data Parsing</h4>
              <p className="text-muted-foreground">Automated parsing and conversion of Two-Line Element orbital data</p>
            </Card>

            <Card className="p-6 bg-card/40 backdrop-blur-sm border-destructive/20 hover:border-destructive/40 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 rounded-full bg-destructive" />
              </div>
              <h4 className="text-xl font-bold mb-2 text-foreground">Collision Detection</h4>
              <p className="text-muted-foreground">Automatic proximity alerts with 50 km threshold monitoring</p>
            </Card>

            <Card className="p-6 bg-card/40 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(96,165,250,0.2)]">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 rounded-full bg-primary" />
              </div>
              <h4 className="text-xl font-bold mb-2 text-foreground">User Dashboard</h4>
              <p className="text-muted-foreground">Comprehensive history tracking and analytics visualization</p>
            </Card>

            <Card className="p-6 bg-card/40 backdrop-blur-sm border-accent/20 hover:border-accent/40 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                <div className="w-6 h-6 rounded-full bg-accent" />
              </div>
              <h4 className="text-xl font-bold mb-2 text-foreground">Orbit Prediction</h4>
              <p className="text-muted-foreground">Future position forecasting with high-precision algorithms</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;

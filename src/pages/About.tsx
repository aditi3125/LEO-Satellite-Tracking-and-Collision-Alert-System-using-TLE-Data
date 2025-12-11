import { Navigation } from "@/components/Navigation";
import { StarField } from "@/components/StarField";
import { Card } from "@/components/ui/card";
import { Satellite, Code, Database, Globe } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navigation />

      <main className="relative z-10 container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            About LEO Tracker
          </h1>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Advanced satellite tracking and collision detection system
          </p>

          <Card className="p-8 bg-card/60 backdrop-blur-sm border-primary/20 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Project Overview</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The LEO Satellite Tracking and Collision Alert System is a comprehensive web-based
              platform that enables users to track Low Earth Orbit (LEO) satellites using TLE
              (Two-Line Element) data and visualize their real-time position and motion.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our system implements advanced orbital mechanics algorithms including RK4 numerical
              integration with J2 perturbation corrections to provide accurate satellite
              trajectory predictions and collision risk assessments.
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 bg-card/60 backdrop-blur-sm border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Satellite className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Real-Time Tracking</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Upload TLE data and track satellite positions with 3D visualization using
                Cesium.js. View orbital parameters, ground tracks, and predicted trajectories.
              </p>
            </Card>

            <Card className="p-6 bg-card/60 backdrop-blur-sm border-destructive/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-destructive/20 rounded-lg">
                  <Globe className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Collision Detection</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Automatic collision alert system that monitors multiple satellites and warns when
                any two satellites approach within 50 km of each other.
              </p>
            </Card>

            <Card className="p-6 bg-card/60 backdrop-blur-sm border-accent/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Code className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Advanced Algorithms</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Implements RK4 numerical integration with J2 perturbation corrections for accurate
                orbital propagation and position prediction.
              </p>
            </Card>

            <Card className="p-6 bg-card/60 backdrop-blur-sm border-secondary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Database className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Data Management</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Secure storage of satellite data, prediction history, and alert logs with
                user-specific access control and analytics.
              </p>
            </Card>
          </div>

          <Card className="p-8 bg-card/60 backdrop-blur-sm border-accent/20">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Technology Stack</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Frontend</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• React.js with TypeScript</li>
                  <li>• Cesium.js for 3D visualization</li>
                  <li>• Tailwind CSS for styling</li>
                  <li>• Shadcn UI components</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Backend</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Lovable Cloud (Supabase)</li>
                  <li>• PostgreSQL database</li>
                  <li>• Edge Functions for computations</li>
                  <li>• Row Level Security (RLS)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Algorithms</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• TLE data parsing</li>
                  <li>• RK4 numerical integration</li>
                  <li>• J2 perturbation corrections</li>
                  <li>• Distance calculations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Features</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• User authentication</li>
                  <li>• Real-time tracking</li>
                  <li>• Collision alerts</li>
                  <li>• Data analytics</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default About;

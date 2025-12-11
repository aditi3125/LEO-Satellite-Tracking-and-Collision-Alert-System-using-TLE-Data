import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PredictionChartProps {
  predictions: Array<{
    time: string;
    hours: string;
    latitude: number;
    longitude: number;
    altitude: number;
    velocity: number;
  }>;
}

export const PredictionChart = ({ predictions }: PredictionChartProps) => {
  const chartData = predictions.map((pred) => ({
    time: `${parseFloat(pred.hours).toFixed(1)}h`,
    altitude: parseFloat(pred.altitude.toFixed(2)),
    velocity: parseFloat(pred.velocity.toFixed(2)),
  }));

  return (
    <Card className="p-6 bg-card/60 backdrop-blur-sm border-accent/20">
      <h3 className="text-xl font-bold mb-4 text-foreground">Orbital Parameters Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            yAxisId="left"
            stroke="hsl(var(--primary))"
            style={{ fontSize: '12px' }}
            label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--accent))"
            style={{ fontSize: '12px' }}
            label={{ value: 'Velocity (km/s)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="altitude" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={false}
            name="Altitude (km)"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="velocity" 
            stroke="hsl(var(--accent))" 
            strokeWidth={2}
            dot={false}
            name="Velocity (km/s)"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { tleLine1, tleLine2, predictHours = 24 } = await req.json()

    console.log('Calculating orbital mechanics for TLE data...')

    // Constants
    const MU = 398600.4418 // Earth's gravitational parameter (km³/s²)
    const J2 = 1.08262668e-3 // J2 perturbation constant
    const RE = 6378.137 // Earth's radius (km)
    const DEG_TO_RAD = Math.PI / 180
    const RAD_TO_DEG = 180 / Math.PI

    // Parse TLE
    const parseTLE = (line1: string, line2: string) => {
      const inclination = parseFloat(line2.substring(8, 16)) * DEG_TO_RAD
      const raan = parseFloat(line2.substring(17, 25)) * DEG_TO_RAD // Right Ascension of Ascending Node
      const eccentricity = parseFloat('0.' + line2.substring(26, 33))
      const argPerigee = parseFloat(line2.substring(34, 42)) * DEG_TO_RAD
      const meanAnomaly = parseFloat(line2.substring(43, 51)) * DEG_TO_RAD
      const meanMotion = parseFloat(line2.substring(52, 63)) // revolutions per day
      
      // Calculate semi-major axis from mean motion
      const n = meanMotion * 2 * Math.PI / 86400 // rad/s
      const a = Math.pow(MU / (n * n), 1/3) // km
      
      return { inclination, raan, eccentricity, argPerigee, meanAnomaly, a, n }
    }

    // Solve Kepler's equation for eccentric anomaly
    const solveKeplerEquation = (M: number, e: number, tolerance = 1e-8) => {
      let E = M
      let delta = 1
      let iterations = 0
      const maxIterations = 100
      
      while (Math.abs(delta) > tolerance && iterations < maxIterations) {
        delta = E - e * Math.sin(E) - M
        E = E - delta / (1 - e * Math.cos(E))
        iterations++
      }
      
      return E
    }

    // Convert orbital elements to Cartesian coordinates
    const orbitalToCartesian = (a: number, e: number, i: number, omega: number, Omega: number, E: number) => {
      // Position in orbital plane
      const x_orbital = a * (Math.cos(E) - e)
      const y_orbital = a * Math.sqrt(1 - e * e) * Math.sin(E)
      
      // Rotation matrices
      const cos_omega = Math.cos(omega)
      const sin_omega = Math.sin(omega)
      const cos_Omega = Math.cos(Omega)
      const sin_Omega = Math.sin(Omega)
      const cos_i = Math.cos(i)
      const sin_i = Math.sin(i)
      
      // Transform to Earth-Centered Inertial (ECI) coordinates
      const x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * x_orbital +
                (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * y_orbital
      const y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * x_orbital +
                (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * y_orbital
      const z = (sin_omega * sin_i) * x_orbital + (cos_omega * sin_i) * y_orbital
      
      return { x, y, z }
    }

    // Convert Cartesian to Geodetic (lat/lon/alt)
    const cartesianToGeodetic = (x: number, y: number, z: number) => {
      const r = Math.sqrt(x * x + y * y + z * z)
      const longitude = Math.atan2(y, x) * RAD_TO_DEG
      const latitude = Math.asin(z / r) * RAD_TO_DEG
      const altitude = r - RE
      
      return { latitude, longitude, altitude }
    }

    // RK4 propagation with J2 perturbation
    const propagateOrbit = (elements: any, deltaT: number) => {
      const { a, e, i, omega, Omega, M, n } = elements
      
      // J2 perturbation effects (simplified)
      const p = a * (1 - e * e)
      const j2_factor = -1.5 * J2 * (RE / p) ** 2
      
      // Secular rates
      const dOmega_dt = j2_factor * n * Math.cos(i)
      const domega_dt = j2_factor * n * (2.5 * Math.sin(i) ** 2 - 2)
      const dM_dt = n * (1 + j2_factor * Math.sqrt(1 - e * e) * (1.5 * Math.sin(i) ** 2 - 1))
      
      // Update elements
      const newOmega = Omega + dOmega_dt * deltaT
      const newomega = omega + domega_dt * deltaT
      const newM = (M + dM_dt * deltaT) % (2 * Math.PI)
      
      return { ...elements, Omega: newOmega, omega: newomega, M: newM }
    }

    // Main calculation
    const elements = parseTLE(tleLine1, tleLine2)
    const predictions = []
    
    // Generate predictions for specified hours
    const timeStep = 300 // 5 minutes in seconds
    const totalSteps = Math.floor((predictHours * 3600) / timeStep)
    
    for (let step = 0; step <= totalSteps; step++) {
      const t = step * timeStep // seconds from epoch
      const hours = t / 3600
      
      // Propagate orbit
      const currentElements = propagateOrbit(
        { ...elements, M: elements.meanAnomaly, omega: elements.argPerigee, Omega: elements.raan, i: elements.inclination },
        t
      )
      
      // Solve Kepler's equation
      const E = solveKeplerEquation(currentElements.M, currentElements.e)
      
      // Get Cartesian position
      const position = orbitalToCartesian(
        currentElements.a,
        currentElements.e,
        currentElements.i,
        currentElements.omega,
        currentElements.Omega,
        E
      )
      
      // Convert to geodetic
      const geodetic = cartesianToGeodetic(position.x, position.y, position.z)
      
      // Calculate velocity
      const velocity = Math.sqrt(MU / currentElements.a) * Math.sqrt(2 / (position.x**2 + position.y**2 + position.z**2) - 1 / currentElements.a)
      
      predictions.push({
        time: new Date(Date.now() + t * 1000).toISOString(),
        hours: hours.toFixed(2),
        latitude: geodetic.latitude,
        longitude: geodetic.longitude,
        altitude: geodetic.altitude,
        velocity: velocity,
        position: position,
        orbitalElements: {
          semiMajorAxis: currentElements.a,
          eccentricity: currentElements.e,
          inclination: currentElements.i * RAD_TO_DEG,
          raan: currentElements.Omega * RAD_TO_DEG,
          argumentOfPerigee: currentElements.omega * RAD_TO_DEG,
          meanAnomaly: currentElements.M * RAD_TO_DEG,
        }
      })
    }

    console.log(`Generated ${predictions.length} orbital predictions`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        predictions,
        summary: {
          totalPredictions: predictions.length,
          timeSpan: `${predictHours} hours`,
          timeStep: '5 minutes'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in orbital mechanics calculation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
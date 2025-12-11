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

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { satelliteCount = 2, thresholdKm = 50 } = await req.json()

    console.log(`Checking collisions for ${satelliteCount} satellites (threshold: ${thresholdKm} km)`)

    // Fetch user's satellites
    const { data: satellites, error: satError } = await supabaseClient
      .from('satellites')
      .select('*')
      .eq('user_id', user.id)
      .limit(satelliteCount)

    if (satError) throw satError

    if (!satellites || satellites.length < 2) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Need at least 2 satellites. Found ${satellites?.length || 0}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate current positions for all satellites
    const positions = await Promise.all(
      satellites.map(async (sat) => {
        const response = await supabaseClient.functions.invoke('orbital-mechanics', {
          body: {
            tleLine1: sat.tle_line1,
            tleLine2: sat.tle_line2,
            predictHours: 0.1 // Just get current position
          }
        })

        if (response.error) throw response.error

        const currentPosition = response.data.predictions[0]
        return {
          satelliteId: sat.id,
          satelliteName: sat.name,
          ...currentPosition.position,
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          altitude: currentPosition.altitude
        }
      })
    )

    // Calculate pairwise distances
    const collisionAlerts = []
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const pos1 = positions[i]
        const pos2 = positions[j]
        
        // Calculate 3D Euclidean distance
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        const dz = pos1.z - pos2.z
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)
        
        console.log(`Distance between ${pos1.satelliteName} and ${pos2.satelliteName}: ${distance.toFixed(2)} km`)
        
        if (distance < thresholdKm) {
          // Collision alert!
          const alert = {
            user_id: user.id,
            satellite1_id: pos1.satelliteId,
            satellite2_id: pos2.satelliteId,
            distance: distance,
            alert_time: new Date().toISOString(),
            is_resolved: false
          }
          
          // Store alert in database
          const { error: alertError } = await supabaseClient
            .from('collision_alerts')
            .insert([alert])
          
          if (alertError) {
            console.error('Error storing alert:', alertError)
          }
          
          collisionAlerts.push({
            ...alert,
            satellite1_name: pos1.satelliteName,
            satellite2_name: pos2.satelliteName,
            position1: { lat: pos1.latitude, lon: pos1.longitude, alt: pos1.altitude },
            position2: { lat: pos2.latitude, lon: pos2.longitude, alt: pos2.altitude }
          })
        }
      }
    }

    const hasCollisions = collisionAlerts.length > 0

    console.log(`Collision check complete: ${hasCollisions ? collisionAlerts.length + ' alerts' : 'No collisions'}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        hasCollisions,
        collisionAlerts,
        satellitesChecked: satellites.length,
        thresholdKm,
        positions,
        summary: {
          totalSatellites: satellites.length,
          pairsChecked: (satellites.length * (satellites.length - 1)) / 2,
          alertsGenerated: collisionAlerts.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in collision detection:', error)
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
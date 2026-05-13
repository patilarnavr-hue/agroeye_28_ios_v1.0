import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SensorDataRequest {
  sensor_code: string;
  moisture_level: number;
  notes?: string;
  protocol?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Sensor data received');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sensor_code, moisture_level, notes, protocol }: SensorDataRequest = await req.json();

    console.log('Processing sensor data:', { sensor_code, moisture_level, protocol });

    // Validate input
    if (!sensor_code || moisture_level === undefined || moisture_level === null) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sensor_code and moisture_level' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (moisture_level < 0 || moisture_level > 100) {
      return new Response(
        JSON.stringify({ error: 'Moisture level must be between 0 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find sensor by code
    const { data: sensor, error: sensorError } = await supabase
      .from('sensors')
      .select('*')
      .eq('sensor_code', sensor_code)
      .eq('is_active', true)
      .single();

    if (sensorError || !sensor) {
      console.error('Sensor not found:', sensorError);
      return new Response(
        JSON.stringify({ error: 'Sensor not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sensor found:', sensor.id);

    // Determine status based on moisture level
    let status = 'optimal';
    if (moisture_level < 30) {
      status = 'low';
    } else if (moisture_level > 70) {
      status = 'high';
    }

    // Insert moisture reading
    const { data: reading, error: readingError } = await supabase
      .from('moisture_readings')
      .insert({
        user_id: sensor.user_id,
        sensor_id: sensor.id,
        moisture_level,
        status,
        notes: notes || `Reading from sensor ${sensor.sensor_name}`,
      })
      .select()
      .single();

    if (readingError) {
      console.error('Error creating reading:', readingError);
      return new Response(
        JSON.stringify({ error: 'Failed to record reading' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update sensor's last reading
    const { error: updateError } = await supabase
      .from('sensors')
      .update({
        last_reading: moisture_level,
        last_reading_at: new Date().toISOString(),
      })
      .eq('id', sensor.id);

    if (updateError) {
      console.error('Error updating sensor:', updateError);
    }

    console.log('Reading recorded successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        reading_id: reading.id,
        sensor_name: sensor.sensor_name,
        status 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing sensor data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

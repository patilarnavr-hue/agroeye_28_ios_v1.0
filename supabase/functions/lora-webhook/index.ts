import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * LoRa Gateway Webhook
 * Accepts payloads from popular LoRa network servers:
 * - The Things Network (TTN) v3
 * - Chirpstack v4
 * - Dragino LPS8/LG308
 * 
 * Maps device EUI → sensor gateway_id, decodes payload, inserts reading.
 */

interface DecodedReading {
  moisture_level: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
}

/** Decode raw LoRa payload bytes (hex string) into sensor values */
function decodePayload(hexPayload: string, fPort?: number): DecodedReading | null {
  try {
    const bytes = new Uint8Array(hexPayload.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));

    // Dragino LSE01 format (fPort 2): 2 bytes battery, 2 bytes temp, 2 bytes moisture, 2 bytes conductivity
    if (bytes.length >= 6) {
      const battery = ((bytes[0] << 8) | bytes[1]) / 1000; // mV to V
      const temperature = ((bytes[2] << 8) | bytes[3]) / 100;
      const moisture = ((bytes[4] << 8) | bytes[5]) / 100;
      
      if (moisture >= 0 && moisture <= 100) {
        return { moisture_level: Math.round(moisture * 10) / 10, temperature, battery };
      }
    }

    // Simple 2-byte moisture format
    if (bytes.length >= 2) {
      const moisture = ((bytes[0] << 8) | bytes[1]) / 100;
      if (moisture >= 0 && moisture <= 100) {
        return { moisture_level: Math.round(moisture * 10) / 10 };
      }
    }

    // Single byte percentage
    if (bytes.length === 1 && bytes[0] <= 100) {
      return { moisture_level: bytes[0] };
    }

    return null;
  } catch {
    return null;
  }
}

/** Extract device EUI and payload from various LoRa server formats */
function parseGatewayPayload(body: any): { devEui: string; payload: string; fPort?: number; decodedPayload?: any } | null {
  // TTN v3 uplink format
  if (body.end_device_ids?.dev_eui) {
    return {
      devEui: body.end_device_ids.dev_eui.toUpperCase(),
      payload: body.uplink_message?.frm_payload
        ? Buffer.from(body.uplink_message.frm_payload, 'base64').toString('hex')
        : '',
      fPort: body.uplink_message?.f_port,
      decodedPayload: body.uplink_message?.decoded_payload,
    };
  }

  // Chirpstack v4 format
  if (body.deviceInfo?.devEui) {
    return {
      devEui: body.deviceInfo.devEui.toUpperCase(),
      payload: body.data ? Buffer.from(body.data, 'base64').toString('hex') : '',
      fPort: body.fPort,
      decodedPayload: body.object,
    };
  }

  // Chirpstack v3 format
  if (body.devEUI) {
    return {
      devEui: body.devEUI.toUpperCase(),
      payload: body.data ? Buffer.from(body.data, 'base64').toString('hex') : '',
      fPort: body.fPort,
      decodedPayload: body.object,
    };
  }

  // Dragino format
  if (body.EUI) {
    return {
      devEui: body.EUI.toUpperCase(),
      payload: body.data || '',
      fPort: body.port,
    };
  }

  // Generic format with dev_eui field
  if (body.dev_eui) {
    return {
      devEui: body.dev_eui.toUpperCase(),
      payload: body.payload || body.data || '',
      fPort: body.f_port || body.fPort,
      decodedPayload: body.decoded,
    };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('LoRa webhook received:', JSON.stringify(body).slice(0, 500));

    const parsed = parseGatewayPayload(body);
    if (!parsed) {
      console.error('Unknown LoRa gateway format');
      return new Response(
        JSON.stringify({ error: 'Unknown gateway format. Supported: TTN v3, Chirpstack v3/v4, Dragino' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed device:', parsed.devEui, 'payload hex:', parsed.payload);

    // Find sensor by gateway_id (device EUI)
    const { data: sensor, error: sensorError } = await supabase
      .from('sensors')
      .select('*')
      .eq('gateway_id', parsed.devEui)
      .eq('is_active', true)
      .eq('protocol', 'lora')
      .single();

    if (sensorError || !sensor) {
      // Also try case-insensitive match
      const { data: sensorAlt } = await supabase
        .from('sensors')
        .select('*')
        .ilike('gateway_id', parsed.devEui)
        .eq('is_active', true)
        .single();

      if (!sensorAlt) {
        console.error('No sensor found for device EUI:', parsed.devEui);
        return new Response(
          JSON.stringify({ error: 'No sensor registered for this device EUI', dev_eui: parsed.devEui }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Use alt sensor
      return await processReading(supabase, sensorAlt, parsed);
    }

    return await processReading(supabase, sensor, parsed);

  } catch (error) {
    console.error('LoRa webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processReading(supabase: any, sensor: any, parsed: any) {
  // Try decoded payload from gateway first (most accurate)
  let moistureLevel: number | null = null;

  if (parsed.decodedPayload) {
    // Gateway already decoded the payload
    moistureLevel = parsed.decodedPayload.moisture
      ?? parsed.decodedPayload.moisture_level
      ?? parsed.decodedPayload.soil_moisture
      ?? parsed.decodedPayload.humidity
      ?? null;
  }

  // Fall back to raw payload decoding
  if (moistureLevel === null && parsed.payload) {
    const decoded = decodePayload(parsed.payload, parsed.fPort);
    if (decoded) {
      moistureLevel = decoded.moisture_level;
    }
  }

  if (moistureLevel === null || moistureLevel < 0 || moistureLevel > 100) {
    return new Response(
      JSON.stringify({ error: 'Could not decode moisture value from payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Determine status
  let status = 'optimal';
  if (moistureLevel < 30) status = 'low';
  else if (moistureLevel > 70) status = 'high';

  // Insert reading
  const { data: reading, error: readingError } = await supabase
    .from('moisture_readings')
    .insert({
      user_id: sensor.user_id,
      sensor_id: sensor.id,
      moisture_level: moistureLevel,
      status,
      notes: `LoRa reading from ${sensor.sensor_name}`,
    })
    .select()
    .single();

  if (readingError) {
    console.error('Error inserting reading:', readingError);
    return new Response(
      JSON.stringify({ error: 'Failed to record reading' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Update sensor last reading
  await supabase
    .from('sensors')
    .update({ last_reading: moistureLevel, last_reading_at: new Date().toISOString() })
    .eq('id', sensor.id);

  console.log('LoRa reading recorded:', moistureLevel, 'for sensor', sensor.sensor_name);

  return new Response(
    JSON.stringify({ success: true, reading_id: reading.id, sensor_name: sensor.sensor_name, status, moisture_level: moistureLevel }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}

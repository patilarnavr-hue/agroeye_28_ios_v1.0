import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const { location } = await req.json();
    
    // Using Open-Meteo free weather API (no API key needed)
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.lat || 0}&longitude=${location.lon || 0}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    );

    if (!weatherResponse.ok) {
      throw new Error('Weather API request failed');
    }

    const weatherData = await weatherResponse.json();
    
    const currentWeather = weatherData.current;
    const dailyForecast = weatherData.daily;

    // Map weather code to condition
    const getWeatherCondition = (code: number) => {
      if (code === 0) return 'Clear';
      if (code <= 3) return 'Partly Cloudy';
      if (code <= 48) return 'Foggy';
      if (code <= 67) return 'Rainy';
      if (code <= 77) return 'Snowy';
      if (code <= 82) return 'Showers';
      if (code <= 99) return 'Thunderstorm';
      return 'Unknown';
    };

    // Store weather data in database
    const { error: insertError } = await supabaseClient
      .from('weather_data')
      .insert({
        user_id: userId,
        location: location.name || 'Unknown',
        temperature: currentWeather.temperature_2m,
        humidity: currentWeather.relative_humidity_2m,
        weather_condition: getWeatherCondition(currentWeather.weather_code),
        precipitation: currentWeather.precipitation,
        wind_speed: currentWeather.wind_speed_10m,
        forecast_data: {
          daily: dailyForecast
        }
      });

    if (insertError) {
      console.error('Error storing weather data:', insertError);
    }

    return new Response(
      JSON.stringify({
        current: {
          temperature: currentWeather.temperature_2m,
          humidity: currentWeather.relative_humidity_2m,
          condition: getWeatherCondition(currentWeather.weather_code),
          precipitation: currentWeather.precipitation,
          windSpeed: currentWeather.wind_speed_10m
        },
        forecast: dailyForecast
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in weather-data function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
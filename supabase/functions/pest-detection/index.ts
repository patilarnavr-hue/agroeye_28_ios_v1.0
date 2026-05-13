import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAIConfig() {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (openaiKey) return { apiKey: openaiKey, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" };
  if (lovableKey) return { apiKey: lovableKey, url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-flash" };
  throw new Error("No AI API key configured. Set OPENAI_API_KEY or LOVABLE_API_KEY.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = getAIConfig();

    const response = await fetch(ai.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${ai.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: "system",
            content: `You are an expert agricultural pathologist and image classifier. Your FIRST task is to determine if the image shows a plant, crop, leaf, or agricultural subject.

STEP 1 - Image Classification:
- If the image does NOT show a plant, leaf, crop, tree, or any agricultural/botanical subject, return:
{
  "is_plant": false,
  "disease_name": "Not a Plant Image",
  "confidence": "High",
  "severity": "None",
  "description": "The uploaded image does not appear to be a plant or crop. Please upload a clear photo of a plant leaf, stem, or crop for disease analysis.",
  "treatment": ["Upload a photo of the actual plant or affected leaf"],
  "prevention": ["Take close-up photos of plant leaves or stems for best results"]
}

STEP 2 - If it IS a plant image, analyze it for diseases, pests, and health issues.
Return a JSON object:
{
  "is_plant": true,
  "disease_name": "Name of disease or 'Healthy Plant'",
  "confidence": "High/Medium/Low",
  "severity": "None/Low/Medium/High",
  "description": "Brief description of the condition",
  "treatment": ["treatment step 1", "treatment step 2"],
  "prevention": ["prevention tip 1", "prevention tip 2"]
}

Be specific about treatments including organic and chemical options. If the plant looks healthy, say so with severity "None".`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "First determine if this is a plant/crop image, then analyze for diseases or pest damage if it is:" },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    let result;
    try {
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent);
    } catch {
      result = {
        is_plant: false,
        disease_name: "Analysis Inconclusive",
        confidence: "Low",
        severity: "Unknown",
        description: "Could not determine the condition. Please try with a clearer image of a plant.",
        treatment: ["Take a clearer photo of the plant and retry"],
        prevention: ["Regular monitoring of crop health"],
      };
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Pest detection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gstin } = await req.json();

    if (!gstin || typeof gstin !== 'string' || gstin.length !== 15) {
      return new Response(
        JSON.stringify({ error: 'Invalid GSTIN format. Must be 15 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(gstin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid GSTIN format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract information directly from GSTIN without external API
    const stateCode = gstin.substring(0, 2);
    const pan = gstin.substring(2, 12);

    const stateMap: Record<string, string> = {
      "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
      "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
      "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
      "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
      "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
      "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
      "24": "Gujarat", "25": "Daman & Diu", "26": "Dadra & Nagar Haveli",
      "27": "Maharashtra", "28": "Andhra Pradesh (Old)", "29": "Karnataka",
      "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
      "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
      "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
    };

    const result = {
      trade_name: '',
      legal_name: '',
      address: '',
      city: '',
      state_code: stateCode,
      state_name: stateMap[stateCode] || '',
      pincode: '',
      pan: pan,
      status: '',
      business_type: '',
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

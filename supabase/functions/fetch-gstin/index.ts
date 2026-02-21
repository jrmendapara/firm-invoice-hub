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

    // Try multiple endpoints
    const endpoints = [
      `https://sheet.gstincheck.co.in/check/FREE_KEY/${gstin}`,
      `https://services.gst.gov.in/services/api/search/taxpayerDetails?gstin=${gstin}`,
    ];

    let gstData: any = null;
    let lastError = '';

    for (const url of endpoints) {
      try {
        console.log('Trying endpoint:', url);
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const text = await response.text();
        
        // Check if response is HTML (blocked/captcha)
        if (text.trim().startsWith('<')) {
          console.log('Got HTML response from:', url);
          lastError = 'GST portal returned a non-JSON response (possibly blocked).';
          continue;
        }

        try {
          gstData = JSON.parse(text);
          if (gstData && !gstData.error && (gstData.tradeNam || gstData.lgnm || gstData.data?.tradeNam || gstData.data?.lgnm)) {
            // Normalize data if wrapped in .data
            if (gstData.data) {
              gstData = gstData.data;
            }
            break;
          }
          // If the API returned an error object
          if (gstData.flag === false || gstData.error) {
            lastError = gstData.message || gstData.error || 'Taxpayer not found.';
            gstData = null;
            continue;
          }
        } catch (parseErr) {
          console.log('JSON parse failed for:', url);
          lastError = 'Failed to parse response.';
          continue;
        }
      } catch (fetchErr) {
        console.log('Fetch failed for:', url, fetchErr);
        lastError = 'Network error connecting to GST service.';
        continue;
      }
    }

    if (!gstData) {
      return new Response(
        JSON.stringify({ error: lastError || 'Could not fetch GSTIN details. Please enter details manually.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map response fields
    const addr = gstData.pradr?.addr || {};
    const addressParts = [addr.bno, addr.st, addr.loc, addr.flno, addr.bnm].filter(Boolean);
    const address = addressParts.join(', ');

    const stateCode = String(addr.stcd || gstin.substring(0, 2)).padStart(2, '0');
    const pan = gstin.substring(2, 12);

    const result = {
      trade_name: gstData.tradeNam || '',
      legal_name: gstData.lgnm || '',
      address: address,
      city: addr.dst || '',
      state_code: stateCode,
      pincode: addr.pncd ? String(addr.pncd) : '',
      pan: pan,
      status: gstData.sts || '',
      business_type: gstData.ctb || '',
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

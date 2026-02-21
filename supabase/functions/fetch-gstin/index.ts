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

    // Call GST portal public taxpayer search API
    const gstUrl = `https://services.gst.gov.in/services/api/search/taxpayerDetails?gstin=${gstin}`;
    
    const gstResponse = await fetch(gstUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!gstResponse.ok) {
      const text = await gstResponse.text();
      console.error('GST API error:', gstResponse.status, text);
      return new Response(
        JSON.stringify({ error: 'GST portal is currently unavailable. Please try again later or enter details manually.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gstData = await gstResponse.json();

    if (!gstData || gstData.errorCode) {
      return new Response(
        JSON.stringify({ error: gstData?.errorMessage || 'Taxpayer not found for this GSTIN.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

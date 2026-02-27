import { formatINR, formatDate, numberToWordsINR } from "@/lib/indian-states";

interface InvoicePrintViewProps {
  invoice: any;
  company: any;
  customer: any;
  items: any[];
  taxSummary: any[];
}

export function InvoicePrintView({ invoice, company, customer, items }: InvoicePrintViewProps) {
  const isInterState = company.state_code !== invoice.place_of_supply_code;
  const minItemRows = 12;
  const fillerRowCount = Math.max(0, minItemRows - (items?.length || 0));
  const logoUrl = company.logo_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${company.logo_url}`
    : null;

  return (
    <div className="print-invoice mx-auto max-w-[210mm] bg-white text-[10px] leading-[1.25] text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          body * { visibility: hidden !important; }
          .print-invoice, .print-invoice * { visibility: visible !important; }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 190mm !important;
            min-height: 277mm;
            max-height: 277mm;
            overflow: hidden;
          }

          .no-print { display: none !important; }

          [id*="lovable" i], [class*="lovable" i], [data-lovable], a[href*="lovable.dev"] {
            display: none !important;
            visibility: hidden !important;
          }
        }

        .print-invoice table { border-collapse: collapse; width: 100%; }
        .print-invoice th, .print-invoice td { border: 1px solid #111; padding: 2px 4px; vertical-align: top; }
        .print-invoice th { background: #efefef; font-weight: 700; text-align: center; }
      `}</style>

      <div className="flex min-h-[277mm] flex-col border-2 border-black">
        {/* Keep logo section, as requested */}
        <div className="grid grid-cols-[190px_1fr] border-b border-black">
          <div className="flex items-center justify-center border-r border-black p-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-[92px] w-[160px] rounded-[20px] border border-[#0d7ca6] object-contain p-1" />
            ) : (
              <div className="flex h-[92px] w-[160px] items-center justify-center rounded-[20px] border border-[#0d7ca6] text-[9px] text-zinc-500">
                LOGO
              </div>
            )}
          </div>
          <div>
            <div className="border-b border-black py-1 text-center text-[20px] font-bold uppercase tracking-wide">{company.name}</div>
            <div className="px-2 py-1 text-center text-[10px] font-medium uppercase">
              {[company.address_line1, company.address_line2, company.city, company.state_name, company.pincode].filter(Boolean).join(", ")}
            </div>
            <div className="border-t border-black py-1 text-center text-[9px]">
              {company.mobile ? `Mobile: ${company.mobile}` : ""}
              {company.mobile && company.email ? " | " : ""}
              {company.email ? `E-mail: ${company.email}` : ""}
            </div>
          </div>
        </div>

        <div className="border-b border-black py-1 text-center text-[15px] font-bold uppercase">Tax Invoice</div>

        {/* Top details (reference style) */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2">
            <div className="grid grid-cols-[88px_1fr] gap-y-0.5">
              <div className="font-semibold">Debit Memo</div><div>:</div>
              <div className="font-semibold">M/s</div><div>: {customer.trade_name}</div>
              <div className="font-semibold">Address</div>
              <div>: {[customer.billing_address_line1, customer.billing_address_line2, customer.billing_city].filter(Boolean).join(", ")}</div>
              <div className="font-semibold">State</div><div>: {customer.billing_state_name || "-"}</div>
              <div className="font-semibold">GSTIN No.</div><div>: {customer.gstin || "-"}</div>
            </div>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-[90px_1fr] gap-y-0.5">
              <div className="font-semibold">Invoice No.</div><div>: {invoice.invoice_number}</div>
              <div className="font-semibold">Invoice Date</div><div>: {formatDate(invoice.invoice_date)}</div>
              <div className="font-semibold">P.O. No.</div><div>: -</div>
              <div className="font-semibold">P.O. Date</div><div>: -</div>
              <div className="font-semibold">Ship To</div><div>: {customer.trade_name}</div>
              <div className="font-semibold">Address</div>
              <div>
                : {[customer.shipping_address_line1 || customer.billing_address_line1, customer.shipping_city || customer.billing_city].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>
        </div>

        {/* Item table */}
        <div className="flex-1">
          <table className="h-full">
            <thead>
              <tr>
                <th className="w-8">S.No</th>
                <th>Product Name</th>
                <th className="w-16">HSN/SAC</th>
                <th className="w-10">Qty</th>
                <th className="w-14">Rate</th>
                <th className="w-10">GST%</th>
                <th className="w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const gstRate = isInterState
                  ? Number(item.igst_percent || 0)
                  : Number(item.cgst_percent || 0) + Number(item.sgst_percent || 0);

                return (
                  <tr key={item.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td>
                      <div className="font-semibold">{item.items?.name || item.description || "-"}</div>
                      {item.description && <div className="text-[9px] text-zinc-700">{item.description}</div>}
                    </td>
                    <td className="text-center">{item.hsn_sac || "-"}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">{Number(item.rate || 0).toFixed(2)}</td>
                    <td className="text-center">{gstRate.toFixed(2)}</td>
                    <td className="text-right">{Number(item.total_amount || 0).toFixed(2)}</td>
                  </tr>
                );
              })}

              {Array.from({ length: fillerRowCount }).map((_, i) => (
                <tr key={`filler-${i}`}>
                  <td className="text-center">&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom area */}
        <div className="grid grid-cols-[2fr_1fr] border-t border-black">
          <div className="border-r border-black p-2">
            <div className="mb-1 font-semibold">GSTIN No.: {company.gstin || "-"}</div>
            {company.bank_name && (
              <>
                <div>Bank Name: {company.bank_name}</div>
                {company.bank_account_no && <div>Bank A/c No.: {company.bank_account_no}</div>}
                {company.bank_ifsc && <div>RTGS/IFSC Code: {company.bank_ifsc}</div>}
              </>
            )}
            <div className="mt-1">Total GST: {formatINR((invoice.total_cgst || 0) + (invoice.total_sgst || 0) + (invoice.total_igst || 0))}</div>
            <div className="mt-1 italic">Bill Amount: {numberToWordsINR(invoice.total_amount)}</div>
            <div className="mt-1 text-[9px]">
              <div className="font-semibold">Terms & Condition:</div>
              <div>1. Physical damage / burn due to high voltage not covered under warranty.</div>
              <div>2. Interest @18% p.a. charged if payment is not made within due date.</div>
              <div>3. Our court and Rajkot court only shall be final in case of disputes.</div>
            </div>
          </div>

          <div className="p-2">
            <div className="space-y-1">
              <div className="flex justify-between border-b border-black pb-0.5"><span className="font-semibold">Sub Total</span><span>{formatINR(invoice.total_taxable_value)}</span></div>
              {!isInterState && (
                <>
                  <div className="flex justify-between"><span>CGST</span><span>{formatINR(invoice.total_cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST</span><span>{formatINR(invoice.total_sgst)}</span></div>
                </>
              )}
              {isInterState && <div className="flex justify-between"><span>IGST</span><span>{formatINR(invoice.total_igst)}</span></div>}
              <div className="mt-1 flex justify-between border-t-2 border-black pt-1 text-[14px] font-bold">
                <span>Grand Total</span>
                <span>{formatINR(invoice.total_amount)}</span>
              </div>
            </div>

            <div className="mt-8 text-right">
              <div className="font-semibold">For, {company.name}</div>
              <div className="mt-8">{company.signatory_name || ""}</div>
              <div className="text-[9px]">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

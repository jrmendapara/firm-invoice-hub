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
  const logoUrl = company.logo_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${company.logo_url}`
    : null;

  return (
    <div className="print-invoice mx-auto flex min-h-[277mm] max-w-[210mm] flex-col bg-white p-8 text-[11px] leading-relaxed text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Print only invoice section */
          body * { visibility: hidden !important; }
          .print-invoice, .print-invoice * { visibility: visible !important; }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          .no-print { display: none !important; }

          /* Hide Lovable/editor overlays or injected badges during print */
          [id*="lovable" i], [class*="lovable" i], [data-lovable], a[href*="lovable.dev"] {
            display: none !important;
            visibility: hidden !important;
          }

          /* Hide any fixed/sticky floating UI that can leak into print */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-invoice *[style*="position: fixed"],
          .print-invoice *[style*="position:sticky"],
          .print-invoice .fixed,
          .print-invoice .sticky {
            display: none !important;
            visibility: hidden !important;
          }
        }
        .print-invoice table { border-collapse: collapse; width: 100%; }
        .print-invoice th, .print-invoice td { border: 1px solid #333; padding: 4px 6px; }
        .print-invoice th { background: #f0f0f0; font-weight: 600; text-align: center; }
      `}</style>

      <div className="mb-1 flex flex-1 flex-col border-2 border-black">
        {/* Header style like sample: logo at left + centered firm details at right */}
        <div className="grid grid-cols-[200px_1fr] border-b border-black">
          <div className="flex items-center justify-center border-r border-black p-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-[100px] w-[170px] rounded-[24px] border border-[#0d7ca6] object-contain p-2" />
            ) : (
              <div className="flex h-[100px] w-[170px] items-center justify-center rounded-[24px] border border-[#0d7ca6] text-xs text-zinc-500">
                LOGO
              </div>
            )}
          </div>
          <div>
            <div className="border-b border-black py-2 text-center text-[22px] font-bold tracking-wide uppercase">
              {company.name}
            </div>
            <div className="py-2 text-center text-[12px] font-medium uppercase">
              {[company.address_line1, company.address_line2, company.city, company.state_name, company.pincode]
                .filter(Boolean)
                .join(", ")}
            </div>
            <div className="border-t border-black py-1 text-center text-[10px]">
              {company.mobile ? `Mobile : ${company.mobile}` : ""}
              {company.mobile && company.email ? " | " : ""}
              {company.email ? `E-mail : ${company.email}` : ""}
            </div>
          </div>
        </div>

        <div className="border-b border-black p-3 text-center text-base font-bold">Tax Invoice</div>

        <div className="grid grid-cols-2">
          <div className="border-r border-black p-3">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-semibold">GSTIN:</div><div>{company.gstin || "N/A"}</div>
              {company.pan && <><div className="font-semibold">PAN:</div><div>{company.pan}</div></>}
              <div className="font-semibold">Invoice No:</div><div>{invoice.invoice_number}</div>
              <div className="font-semibold">Date:</div><div>{formatDate(invoice.invoice_date)}</div>
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="font-semibold">Place of Supply:</div><div>{invoice.place_of_supply_code} - {invoice.place_of_supply_state}</div>
              <div className="font-semibold">Reverse Charge:</div><div>{invoice.is_reverse_charge ? "Yes" : "No"}</div>
              {invoice.eway_bill_number && <><div className="font-semibold">E-Way Bill:</div><div>{invoice.eway_bill_number}</div></>}
              {invoice.vehicle_number && <><div className="font-semibold">Vehicle No:</div><div>{invoice.vehicle_number}</div></>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            <div className="mb-1 font-semibold">Bill To:</div>
            <div className="font-bold">{customer.trade_name}</div>
            {customer.legal_name && <div>{customer.legal_name}</div>}
            {customer.billing_address_line1 && <div>{customer.billing_address_line1}</div>}
            {customer.billing_address_line2 && <div>{customer.billing_address_line2}</div>}
            <div>{[customer.billing_city, customer.billing_state_name, customer.billing_pincode].filter(Boolean).join(", ")}</div>
            {customer.gstin && <div className="mt-1 font-semibold">GSTIN: {customer.gstin}</div>}
          </div>
          <div className="p-3">
            <div className="mb-1 font-semibold">Ship To:</div>
            <div className="font-bold">{customer.trade_name}</div>
            {customer.shipping_address_line1 && <div>{customer.shipping_address_line1}</div>}
            {customer.shipping_address_line2 && <div>{customer.shipping_address_line2}</div>}
            <div>{[customer.shipping_city, customer.shipping_state_name, customer.shipping_pincode].filter(Boolean).join(", ")}</div>
          </div>
        </div>

        <div className="border-t border-black">
          <table>
            <thead>
              <tr>
                <th className="w-8">S.No</th>
                <th>Item</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate (₹)</th>
                <th>Disc%</th>
                <th>Taxable (₹)</th>
                {isInterState ? <th>IGST (₹)</th> : <><th>CGST (₹)</th><th>SGST (₹)</th></>}
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-center">{idx + 1}</td>
                  <td>
                    <div className="font-medium">{item.items?.name || item.description}</div>
                    {item.description && (
                      <div className="text-[10px] text-zinc-700">{item.description}</div>
                    )}
                  </td>
                  <td className="text-center">{item.hsn_sac || "-"}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-center">{item.unit || "-"}</td>
                  <td className="text-right">{Number(item.rate || 0).toFixed(2)}</td>
                  <td className="text-center">{item.discount_percent > 0 ? `${item.discount_percent}%` : "-"}</td>
                  <td className="text-right">{Number(item.taxable_value).toFixed(2)}</td>
                  {isInterState ? (
                    <td className="text-right">{Number(item.igst_amount).toFixed(2)}</td>
                  ) : (
                    <>
                      <td className="text-right">{Number(item.cgst_amount).toFixed(2)}</td>
                      <td className="text-right">{Number(item.sgst_amount).toFixed(2)}</td>
                    </>
                  )}
                  <td className="text-right">{Number(item.total_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            <div className="font-semibold">Amount in Words:</div>
            <div className="italic">{invoice.amount_in_words || numberToWordsINR(invoice.total_amount)}</div>
          </div>
          <div className="p-3">
            <div className="space-y-1">
              <div className="flex justify-between"><span>Taxable Value:</span><span>{formatINR(invoice.total_taxable_value)}</span></div>
              {!isInterState && (
                <>
                  <div className="flex justify-between"><span>CGST:</span><span>{formatINR(invoice.total_cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST:</span><span>{formatINR(invoice.total_sgst)}</span></div>
                </>
              )}
              {isInterState && <div className="flex justify-between"><span>IGST:</span><span>{formatINR(invoice.total_igst)}</span></div>}
              {invoice.discount_amount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatINR(invoice.discount_amount)}</span></div>}
              {invoice.round_off !== 0 && <div className="flex justify-between"><span>Round Off:</span><span>{formatINR(invoice.round_off)}</span></div>}
              <div className="flex justify-between border-t border-black pt-1 text-sm font-bold">
                <span>Grand Total:</span><span>{formatINR(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-3">
            {company.bank_name && (
              <>
                <div className="mb-1 font-semibold">Bank Details:</div>
                <div>Bank: {company.bank_name}</div>
                {company.bank_branch && <div>Branch: {company.bank_branch}</div>}
                {company.bank_account_no && <div>A/c No: {company.bank_account_no}</div>}
                {company.bank_ifsc && <div>IFSC: {company.bank_ifsc}</div>}
              </>
            )}
            <div className="mt-3 text-[10px]">
              <div className="font-semibold">Declaration:</div>
              <div>We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.</div>
            </div>
          </div>
          <div className="p-3 text-right">
            <div className="font-semibold">For {company.name}</div>
            <div className="mt-12">{company.signatory_name || ""}</div>
            <div className="text-xs">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}

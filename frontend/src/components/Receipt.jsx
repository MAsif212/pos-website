import { Printer } from "lucide-react";
import Modal from "./Modal";
import { formatRs, formatDate } from "../utils/format";

const STORE = {
  name: "FRESHMART",
  tagline: "Supermarket",
  address: "Main Market Road",
  phone: "0300-0000000",
};

export default function Receipt({ sale, onClose, title = "Sale complete" }) {
  if (!sale) return null;

  return (
    <Modal open={!!sale} title={title} onClose={onClose}>
      <div id="receipt" className="rounded-xl bg-white p-5 font-mono text-sm text-cocoa">
        <div className="mb-3 text-center">
          <p className="font-serif text-2xl tracking-[0.2em]">{STORE.name}</p>
          <p>{STORE.tagline}</p>
          <p>{STORE.address}</p>
          <p>Tel: {STORE.phone}</p>
        </div>

        <div className="border-y border-dashed border-mocha py-2">
          <p>Invoice: {sale.invoiceNo}</p>
          <p>Date: {formatDate(sale.createdAt)}</p>
          <p>Customer: {sale.customerName}</p>
          {sale.status === "refunded" && <p className="font-bold">*** REFUNDED ***</p>}
        </div>

        <table className="my-2 w-full">
          <thead>
            <tr className="text-left">
              <th className="py-1 font-semibold">Item</th>
              <th className="py-1 text-center font-semibold">Qty</th>
              <th className="py-1 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, i) => (
              <tr key={i} className="align-top">
                <td className="py-1 pr-2">
                  {item.name}
                  <br />
                  <span className="text-xs text-mocha">@ {formatRs(item.price)}</span>
                </td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{formatRs(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 border-t border-dashed border-mocha pt-2">
          <Row label="Subtotal" value={formatRs(sale.subtotal)} />
          {sale.discount > 0 && <Row label="Discount" value={"- " + formatRs(sale.discount)} />}
          <Row label="GST" value={formatRs(sale.tax)} />
          <div className="flex justify-between border-t border-dashed border-mocha pt-1 text-base font-bold">
            <span>TOTAL</span>
            <span>{formatRs(sale.total)}</span>
          </div>
          <Row label={`Paid (${sale.paymentMethod})`} value={formatRs(sale.amountPaid)} />
          <Row label="Change" value={formatRs(sale.change)} />
        </div>

        <p className="mt-4 text-center">Thank you for shopping with us!</p>
      </div>

      <div className="no-print mt-4 flex gap-2">
        <button className="btn btn-secondary flex-1" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary flex-1" onClick={() => window.print()}>
          <Printer size={18} /> Print receipt
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
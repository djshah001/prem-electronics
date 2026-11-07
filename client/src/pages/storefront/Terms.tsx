import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, Truck, CreditCard, PhoneCall, Scale } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Terms & Conditions</span>
        </nav>

        {/* Header */}
        <div className="mb-10 border-b border-border/60 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <FileText className="w-3.5 h-3.5" />
            <span>Store Terms & Purchase Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-['Outfit'] text-foreground tracking-tight mb-3">
            Terms & <span className="text-primary">Conditions</span>
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please read these terms carefully before placing orders • Prem Electronics, Vadodara, Gujarat, India
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-xs leading-relaxed text-muted-foreground">
          {/* Acceptance & Platform Usage */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              1. General Terms & Platform Usage
            </h2>
            <p>
              This website, <strong className="text-foreground">premelectronics.com</strong>, is owned and operated by <strong className="text-foreground">Prem Electronics</strong>. By accessing, browsing, registering an account, or purchasing products on this platform, you agree to be legally bound by these Terms and Conditions and our associated Privacy Policy.
            </p>
            <p>
              All content and product information on this site is provided for general commercial information. We reserve the right to revise these terms or product specifications at any time without prior individual notice.
            </p>
          </section>

          {/* Pricing, Payment & 100% Advance Policy */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              2. Product Pricing & 100% Advance Payment Policy
            </h2>
            <p>
              All prices listed on Prem Electronics are in <strong className="text-foreground">Indian Rupees (INR)</strong> and are inclusive of applicable Goods and Services Tax (GST).
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">100% Advance Payment:</strong> Due to the high value and precision nature of photography, cinema, drone, and gimbal equipment, all orders are processed exclusively upon receipt of 100% advance payment through verified payment methods (Credit/Debit Card, Net Banking, UPI, or pre-approved EMI via Razorpay).
              </li>
              <li>
                <strong className="text-foreground">Pricing Accuracy:</strong> While utmost care is taken to display correct pricing, occasional technical glitches or distributor revision errors may occur. In the rare event an item is listed at an incorrect price, Prem Electronics reserves the right to decline, hold, or cancel the order prior to shipment and issue a complete refund.
              </li>
            </ul>
          </section>

          {/* High-Value Order Phone Verification */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-primary shrink-0" />
              3. High-Value Order Phone Verification
            </h2>
            <p>
              To safeguard our customers against fraudulent transactions, address discrepancies, or courier misdeliveries, our dispatch operations desk may contact you via telephone to confirm:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Accuracy of the recipient name, primary phone number, and delivery PIN code.</li>
              <li>Applicability of business GST details where Input Tax Credit has been requested.</li>
              <li>Confirmation of specialized delivery instructions for high-value optical or cinema gear.</li>
            </ul>
            <p className="text-[11px] text-muted-foreground/80 italic">
              Dispatch timelines begin once order and address verification is completed.
            </p>
          </section>

          {/* GST Invoicing & Input Tax Credit (ITC) */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary shrink-0" />
              4. Commercial GST Invoicing & Tax Credit (ITC)
            </h2>
            <p>
              Prem Electronics provides legally compliant GST tax invoices for all purchases:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">B2B Input Tax Credit:</strong> If you are purchasing for a registered commercial production house, photography studio, agency, or corporation, you must enter your valid 15-digit GSTIN and registered legal business name during checkout.
              </li>
              <li>
                <strong className="text-foreground">Invoice Issuance:</strong> The generated tax invoice will include your verified GSTIN, proper HSN codes, and State Code to ensure smooth Input Tax Credit (ITC) claim under Indian GST regulations.
              </li>
              <li>
                <strong className="text-foreground">Post-Dispatch Modifications:</strong> Because invoices are digitally registered and synced with GST portals, amendments to company details or GSTIN cannot be processed once the invoice and package have been dispatched.
              </li>
            </ul>
          </section>

          {/* Dispatch Timelines, Shipping & Partial Shipments */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              5. Shipping, Dispatch Timelines & Partial Shipments
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Dispatch Timelines:</strong> Standard orders are typically dispatched within <strong className="text-foreground">2 to 3 business days</strong> following successful advance payment receipt and verification.
              </li>
              <li>
                <strong className="text-foreground">PAN India Delivery:</strong> We ship across all serviceable PIN codes in India using reputed logistics partners (Blue Dart, Delhivery, DTDC, etc.). Tracking credentials are provided via email and SMS upon carrier pickup.
              </li>
              <li>
                <strong className="text-foreground">Partial Shipments Policy:</strong> If a multi-product order includes an item that is temporarily out of stock or requires distributor back-order allocation, Prem Electronics may split the shipment to deliver available items immediately. Customers will <strong className="text-foreground">never be charged additional shipping fees</strong> for the subsequent balance shipments. Customers will be kept informed and retain the option to cancel any delayed balance item for a prompt refund.
              </li>
            </ul>
          </section>

          {/* Genuine Gear & Manufacturer Warranty */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              6. 100% Genuine Products & Official Manufacturer Warranty
            </h2>
            <p>
              Prem Electronics is committed to authentic, brand-authorized consumer and professional creator gear:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>
                All products sold are <strong className="text-foreground">100% genuine, brand new, and sealed</strong>, backed by official manufacturer warranties valid at authorized service centers across India.
              </li>
              <li>
                <strong className="text-foreground">Electrical & Power Caution:</strong> Electronic studio equipment, chargers, and camera bodies damaged as a result of improper electrical input, voltage fluctuations, or non-stabilized power outlets are ineligible for return or free repair. Customers are strongly advised to utilize certified voltage stabilizers and surge protectors.
              </li>
            </ul>
          </section>

          {/* Governing Law & Jurisdiction */}
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary shrink-0" />
              7. Governing Law & Exclusive Jurisdiction
            </h2>
            <p>
              These Terms and Conditions shall be governed by, construed, and enforced in accordance with the substantive laws of India. Any legal action, suit, or dispute arising out of or in connection with transactions on Prem Electronics shall be subject to the <strong className="text-foreground">exclusive jurisdiction of the competent courts in Vadodara, Gujarat, India</strong>.
            </p>
          </section>
        </div>

        {/* Footer Support Notice */}
        <div className="mt-12 p-6 rounded-2xl bg-muted/20 border border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-foreground">Need clarification regarding our terms or orders?</p>
            <p className="text-muted-foreground">
              Our customer operations desk is available Mon - Sat (10:00 AM - 7:00 PM IST) at <span className="text-foreground font-medium">support@premelectronics.com</span>.
            </p>
          </div>
          <Link
            to="/contact"
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap shadow-xs"
          >
            Contact Support Desk
          </Link>
        </div>
      </div>
    </div>
  );
}
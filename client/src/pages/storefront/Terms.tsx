import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background mt-16 sm:mt-20 py-8 sm:py-12">
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
        <div className="mb-12 border-b border-border/60 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-['Outfit'] text-foreground tracking-tight mb-3">
            Terms & <span className="text-primary">Conditions</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Last Updated: October 2026 • Prem Electronics (Vadodara, Gujarat, India)
          </p>
        </div>

        {/* Content Sections */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-xs leading-relaxed text-muted-foreground">
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By browsing, accessing, or placing orders through Prem Electronics (premelectronics.com), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms and Conditions. If you do not agree to these terms, please refrain from using the platform.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              2. Authentic Products, Pricing & Availability
            </h2>
            <p>
              All equipment, including cameras, cinema lenses, gimbals, microphones, and creator electronics, are certified 100% original inventory supplied through authorized Indian distributors. Prices are listed in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST).
            </p>
            <p>
              While we make every effort to ensure accurate stock levels and pricing, typographical errors or sudden distributor adjustments may occasionally occur. Prem Electronics reserves the right to cancel or adjust orders placed under erroneous pricing prior to shipment.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              3. GST Invoicing & Commercial Tax Credit
            </h2>
            <p>
              Customers purchasing for commercial studios, agencies, or businesses may input their GSTIN during checkout. The generated tax invoice will include the customer’s verified legal name and GSTIN, enabling legal claims of Input Tax Credit (ITC). Amendments to invoices post-dispatch are subject to statutory GST reconciliation timelines.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              4. Payment Security & Processing
            </h2>
            <p>
              All online payments are securely processed through Razorpay and certified RBI-compliant payment gateways. We do not store sensitive card CVVs or net banking passwords. Orders are confirmed only upon successful payment authorization or verified online transaction receipts.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              5. Shipping, Transit Insurance & Delivery
            </h2>
            <p>
              High-value photography and production hardware are shipped via insured expedited courier services across India. Customers are advised to record an unboxing video when opening their parcel to support any immediate claim of shipping transit damage or missing items.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              6. Manufacturer Warranty & Authenticity
            </h2>
            <p>
              All hardware sold on Prem Electronics is brand new, sealed, and carries official manufacturer warranty valid at authorized service centers across India. For any hardware, calibration, or technical concerns, customers are supported directly through the respective brand's authorized warranty network.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              7. Governing Law & Jurisdiction
            </h2>
            <p>
              These Terms & Conditions are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or related to transactions with Prem Electronics shall be subject to the exclusive jurisdiction of the competent courts in Vadodara, Gujarat.
            </p>
          </section>
        </div>

        {/* Footer Support Notice */}
        <div className="mt-12 p-6 rounded-2xl bg-muted/20 border border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-muted-foreground">
            Have questions regarding our terms? Reach out to <span className="text-foreground font-semibold">support@premelectronics.com</span>.
          </p>
          <Link
            to="/contact"
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap shadow-sm"
          >
            Contact Legal Desk
          </Link>
        </div>
      </div>
    </div>
  );
}

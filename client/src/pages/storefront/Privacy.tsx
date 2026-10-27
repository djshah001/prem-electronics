import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, CheckCircle2 } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Privacy Policy</span>
        </nav>

        {/* Header */}
        <div className="mb-12 border-b border-border/60 pb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-['Outfit'] text-foreground tracking-tight mb-3">
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Effective Date: October 2026 • Prem Electronics (Vadodara, Gujarat, India)
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-xs leading-relaxed text-muted-foreground">
          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              1. Information We Collect
            </h2>
            <p>
              When you visit or place orders on Prem Electronics, we collect necessary information to fulfill transactions and provide customer assistance:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Contact & Identity Data:</strong> Name, email address, phone number, and delivery address.</li>
              <li><strong className="text-foreground">Business Invoicing Details:</strong> Company legal name, trade name, and GSTIN for B2B input tax credits.</li>
              <li><strong className="text-foreground">Transaction Logs:</strong> Order histories, payment confirmation references, and customer support correspondence.</li>
            </ul>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              2. How Your Information Is Used
            </h2>
            <p>
              Your personal and business data is collected solely for legitimate operational purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Processing, billing, and packaging your camera and electronic equipment.</li>
              <li>Coordinating with insured courier and logistics partners for delivery updates.</li>
              <li>Providing warranty registration verification and post-sale technical assistance.</li>
              <li>Complying with statutory accounting and Goods & Services Tax (GST) regulations under Indian law.</li>
            </ul>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              3. Payment Security & Data Sharing
            </h2>
            <p>
              Prem Electronics <strong className="text-foreground">does not sell, rent, or trade customer data</strong> to any third parties for marketing.
            </p>
            <p>
              Payments are executed via encrypted, PCI-DSS compliant payment gateways (Razorpay). Your debit/credit card numbers and CVVs are processed directly by certified financial institutions and are never stored on our servers.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              4. Cookies and Account Security
            </h2>
            <p>
              We use secure, HTTP-only session cookies to manage shopping cart items and customer authentication states. You can control or clear cookies within your browser settings; however, disabling essential cookies may impact checkout functionality.
            </p>
          </section>

          <section className="space-y-3 bg-card border border-border rounded-2xl p-6 sm:p-8">
            <h2 className="text-base font-bold font-['Outfit'] text-foreground">
              5. Grievance Officer & Inquiries
            </h2>
            <p>
              In accordance with the Information Technology Act 2000 and rules made thereunder, any queries, concerns, or requests regarding your personal data may be addressed to our designated Grievance Officer:
            </p>
            <div className="p-4 rounded-xl bg-muted/40 text-foreground font-medium space-y-1">
              <p>Prem Electronics Grievance Desk</p>
              <p className="text-muted-foreground text-xs">Vadodara, Gujarat, India</p>
              <p className="text-primary text-xs">Email: support@premelectronics.com</p>
              <p className="text-muted-foreground text-xs">Phone: +91 98765 43210</p>
            </div>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
          >
            <span>Return to Electronics Catalog →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

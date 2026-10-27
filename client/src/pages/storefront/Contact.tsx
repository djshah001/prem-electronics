import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Send,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success('Your message has been sent successfully! Our team will get back to you within 24 hours.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: '',
      });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Contact Us</span>
        </nav>

        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Creator Support</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-['Outfit'] text-foreground tracking-tight mb-4">
            Get in <span className="text-primary">Touch</span> With Us
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Have questions about cameras, lenses, gimbals, or looking for an official quote? Our electronics specialists are ready to help.
          </p>
        </div>

        {/* Main Grid: Contact Cards + Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-bold font-['Outfit'] text-foreground border-b border-border/60 pb-3">
                Contact Information
              </h3>

              <div className="space-y-4">
                <a
                  href="tel:+919876543210"
                  className="flex items-start gap-4 p-3.5 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Call Us Directly</p>
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      +91 98765 43210
                    </p>
                    <p className="text-[11px] text-muted-foreground">Mon – Sat: 10:00 AM – 8:00 PM</p>
                  </div>
                </a>

                <a
                  href="mailto:support@premelectronics.com"
                  className="flex items-start gap-4 p-3.5 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email Support</p>
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors break-all">
                      support@premelectronics.com
                    </p>
                    <p className="text-[11px] text-muted-foreground">Responses within 24 business hours</p>
                  </div>
                </a>

                <div className="flex items-start gap-4 p-3.5 rounded-xl bg-muted/20">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Store & Office Location</p>
                    <p className="text-sm font-bold text-foreground leading-snug">
                      Shivakruti Complex, Shivaji Road, Dandia Bazar, Vadodara, Gujarat - 390001
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Opposite Sayaji Radio & Fire Brigade Station</p>
                  </div>
                </div>

                {/* <div className="flex items-start gap-4 p-3.5 rounded-xl bg-muted/20">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Working Hours</p>
                    <p className="text-sm font-bold text-foreground">Monday – Saturday</p>
                    <p className="text-[11px] text-muted-foreground">10:00 AM to 8:00 PM IST (Sunday closed)</p>
                  </div>
                </div> */}

              </div>
            </div>

            {/* Quick Trust Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-foreground space-y-3">
              <div className="flex items-center gap-2.5 text-primary font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>100% Genuine Gear Guarantee</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All cameras, lenses, and creator accessories distributed through Prem Electronics come with official brand warranties and manufacturer invoices.
              </p>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-xl font-bold font-['Outfit'] text-foreground mb-2">
                Send Us a Message
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Fill in your details below and our team will get back to you shortly.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Your Full Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Order & Shipping Support">Order & Shipping Support</option>
                      <option value="Product Advice & Recommendations">Product Advice & Recommendations</option>
                      <option value="Bulk / B2B Purchase">Bulk / B2B Purchase</option>
                      <option value="Warranty & Repairs">Warranty & Repairs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Your Message <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us how we can help you with your gear or inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground text-sm sm:text-base font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md"
                >
                  {loading ? (
                    <span>Sending message...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>

                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Message received. A support specialist will respond shortly!</span>
                  </motion.div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Google Maps Location Section */}
        <div className="mt-14 sm:mt-16 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-foreground">
                Visit Our Store in Vadodara
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Shivakruti Complex, Shivaji Road, Dandia Bazar, Vadodara, Gujarat - 390001
              </p>
            </div>
            <a
              href="https://maps.google.com/?q=Prem+Electronics,+Shivakruti+Complex,+Shivaji+Road,+Dandia+Bazar,+Vadodara,+Gujarat+390001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors shrink-0"
            >
              <MapPin className="w-4 h-4" />
              <span>Open in Google Maps →</span>
            </a>
          </div>

          <div className="w-full h-[380px] sm:h-[450px] lg:h-[500px] rounded-2xl overflow-hidden border border-border shadow-sm bg-card relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d59062.78955405105!2d73.1244819486328!3d22.299785699999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395fc50032b197d5%3A0xd87b218f806867f8!2sPrem%20electronics!5e0!3m2!1sen!2sin!4v1793128255779!5m2!1sen!2sin"
              title="Prem Electronics Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

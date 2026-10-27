import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  Headphones,
  Heart,
} from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import { resolveNavCategories } from "../../config/navigationCategories";

export const Footer = () => {
  const { categories } = useCategories();
  const resolved = resolveNavCategories(categories);

  // Exact 5 Trending Categories in requested order:
  // Cameras, Camera Lenses, Action Cameras, Gimbal & Stabilizers, Audio
  const trendingSlugs = [
    { name: "Cameras", slug: "cameras" },
    { name: "Camera Lenses", slug: "camera-lenses" },
    { name: "Action Cameras", slug: "action-cameras" },
    { name: "Gimbal & Stabilizers", slug: "gimbal-stabilizers" },
    { name: "Audio", slug: "audio" },
  ];

  const trendingLinks = trendingSlugs.map((t) => {
    const match = resolved.find((c) => c.slug === t.slug);
    return {
      name: t.name,
      href: match ? match.href : `/shop?categorySlug=${t.slug}`,
    };
  });

  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-card/40 pt-16 pb-8 backdrop-blur-md">
      {/* Background Pink Ambient Light */}
      <div className="pointer-events-none absolute left-1/2 -top-24 -translate-x-1/2 h-64 w-[650px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Value Assurance Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-14 border-b border-border/60">
          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[0.95rem] font-bold text-foreground">
                Official Warranty
              </h4>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                100% manufacturer warranty included
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[0.95rem] font-bold text-foreground">
                Insured Fast Shipping
              </h4>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Safe, damage-free transit across India
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-[0.95rem] font-bold text-foreground">
                Dedicated Support
              </h4>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Live tech assistance for your gear
              </p>
            </div>
          </div>
        </div>

        {/* Four-Section Layout: Brand Info -> Quick Links -> Trending Categories -> Contact Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 py-14 border-b border-border/60">
          {/* Section 1: Brand Information */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/Symbol.jpg"
                alt="Prem Logo"
                className="h-9 w-9 object-contain"
              />
              <img
                src="/logo.png"
                alt="Prem Electronics"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Prem Electronics delivers certified professional gear, creator
              essentials, drones, audio units, and smart appliances straight
              from authorized distributors.
            </p>
          </div>

          {/* Section 2: Quick Links */}
          <div className="space-y-3 sm:col-span-1 lg:col-span-2">
            <h5 className="font-['Outfit'] text-[0.95rem] font-bold tracking-tight text-foreground">
              Quick Links
            </h5>
            <ul className="space-y-2.5 text-[13px] sm:text-sm text-muted-foreground">
              <li>
                <Link
                  to="/about"
                  className="hover:text-primary transition-colors inline-block"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="hover:text-primary transition-colors inline-block"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Terms &amp; Condition
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-primary transition-colors inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 3: Trending Categories */}
          <div className="space-y-3 sm:col-span-1 lg:col-span-3">
            <h5 className="font-['Outfit'] text-[0.95rem] font-bold tracking-tight text-foreground">
              Trending Categories
            </h5>
            <ul className="space-y-2.5 text-[13px] sm:text-sm text-muted-foreground">
              {trendingLinks.map((cat) => (
                <li key={cat.name}>
                  <Link
                    to={cat.href}
                    className="hover:text-primary transition-colors inline-block"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 4: Contact Details */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-3">
            <h5 className="font-['Outfit'] text-[0.95rem] font-bold tracking-tight text-foreground">
              Contact Details
            </h5>
            <div className="space-y-2.5 text-[13px] sm:text-sm text-muted-foreground">
              <div>
                <a
                  href="tel:+919876543210"
                  className="flex items-center gap-2.5 hover:text-primary transition-colors group"
                >
                  <Phone className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                  <span>+91 98765 43210</span>
                </a>
              </div>
              <div>
                <a
                  href="mailto:support@premelectronics.com"
                  className="flex items-center gap-2.5 hover:text-primary transition-colors group"
                >
                  <Mail className="h-4 w-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                  <span>support@premelectronics.com</span>
                </a>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <a
                  href="https://maps.app.goo.gl/N458cZBAq4YGEJyq9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors leading-relaxed"
                >
                  Shivakruti Complex, Shivaji Road, Dandia Bazar, Vadodara, Gujarat - 390001
                </a>
              </div>

              {/* Social Media Icons: WhatsApp, Instagram, Facebook center-aligned directly below address */}
              <div className="pt-3 flex items-center justify-start gap-3">
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  title="Contact us on WhatsApp"
                  className="w-8 h-8 rounded-lg bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200 hover:scale-105 shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Follow us on Instagram"
                  className="w-8 h-8 rounded-lg bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-pink-500 hover:border-pink-500/40 hover:bg-pink-500/10 transition-all duration-200 hover:scale-105 shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Follow us on Facebook"
                  className="w-8 h-8 rounded-lg bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all duration-200 hover:scale-105 shadow-xs"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Prem Electronics. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Engineered with{" "}
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> for
            creators.
          </p>
        </div>
      </div>
    </footer>
  );
};

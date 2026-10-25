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
            <Link to="/" className="inline-flex items-center gap-2">
              <img
                src="/Symbol.jpg"
                alt="Prem Logo"
                className="h-7 w-7 object-contain"
              />
              <img
                src="/logo.png"
                alt="Prem Electronics"
                className="h-6 w-auto object-contain"
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
                  href="https://maps.google.com/?q=Vadodara,+Gujarat,+India"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Vadodara, Gujarat, India
                </a>
              </div>
              {/* <div className="flex items-center gap-2.5 pt-1 text-muted-foreground/80">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>Mon – Sat: 10:00 AM – 8:00 PM IST</span>
              </div> */}
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

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSubscribed(true);
    toast.success("Thank you for subscribing to Prem Electronics!");
    setEmail("");
  };

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
              <h4 className="text-sm font-bold text-foreground">
                Official Warranty
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                100% manufacturer warranty included
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                7-Day Replacement
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hassle-free defective replacements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Dedicated Support
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live tech assistance for your gear
              </p>
            </div>
          </div>
        </div>

        {/* Links & Brand Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 py-14 border-b border-border/60">
          {/* Brand Info */}
          <div className="md:col-span-4 space-y-4">
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
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Prem Electronics delivers certified professional gear, creator
              essentials, drones, audio units, and smart appliances straight
              from authorized distributors.
            </p>
            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>support@premelectronics.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Vadodara, Gujarat, India</span>
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="font-['Outfit'] text-sm font-bold tracking-tight text-foreground">
              Shop Categories
            </h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/shop?category=cameras"
                  className="hover:text-primary transition-colors"
                >
                  Cameras & 360°
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=drones"
                  className="hover:text-primary transition-colors"
                >
                  Drones & Flight
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=gimbals"
                  className="hover:text-primary transition-colors"
                >
                  Stabilizers & Gimbals
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?category=audio"
                  className="hover:text-primary transition-colors"
                >
                  Wireless Audio
                </Link>
              </li>
              <li>
                <Link
                  to="/shop?isFeatured=true"
                  className="hover:text-primary transition-colors"
                >
                  Special Deals
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Account */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="font-['Outfit'] text-sm font-bold tracking-tight text-foreground">
              Customer Care
            </h5>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/account/orders"
                  className="hover:text-primary transition-colors"
                >
                  Track Orders
                </Link>
              </li>
              <li>
                <Link
                  to="/wishlist"
                  className="hover:text-primary transition-colors"
                >
                  My Wishlist
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-primary transition-colors"
                >
                  Warranty & Returns
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-primary transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="md:col-span-4 space-y-3">
            <h5 className="font-['Outfit'] text-sm font-bold tracking-tight text-foreground">
              Insider Deals
            </h5>
            <p className="text-xs text-muted-foreground">
              Subscribe to get product launch updates and exclusive discount
              drops.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-border bg-background/80 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg bg-primary text-white transition-transform hover:scale-105 active:scale-95 shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              {subscribed && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> Subscribed successfully!
                </p>
              )}
            </form>
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

import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin, MessageCircle, Globe, Camera, Play } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg font-['Outfit']">
                <span className="gradient-text">Prem</span> Electronics
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your trusted destination for premium electronics. Authentic products, competitive prices, and exceptional service.
            </p>
            <div className="flex gap-3">
              {[MessageCircle, Globe, Camera, Play].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 font-['Outfit']">Categories</h4>
            <ul className="space-y-2">
              {['Smartphones', 'Laptops', 'Audio', 'Televisions', 'Cameras'].map((cat) => (
                <li key={cat}>
                  <Link to={`/shop?search=${cat.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 font-['Outfit']">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: 'My Account', href: '/account' },
                { label: 'Track Order', href: '/account/orders' },
                { label: 'Return Policy', href: '#' },
                { label: 'Warranty Info', href: '#' },
                { label: 'EMI Options', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 font-['Outfit']">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>123 Electronics Hub, MG Road, Bengaluru, Karnataka 560001</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="tel:+918001234567" className="hover:text-primary transition-colors">+91 800 123 4567</a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href="mailto:support@premelectronics.com" className="hover:text-primary transition-colors">support@premelectronics.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Prem Electronics. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

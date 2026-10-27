import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Truck,
  Headphones,
  Award,
  Users,
  Camera,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export default function About() {
  const stats = [
    { label: 'Verified Creators Served', value: '50,000+' },
    { label: 'Authorized Brands', value: '80+' },
    { label: 'Direct Brand Warranty', value: '100% Genuine' },
    { label: 'Cities Delivered', value: '500+' },
  ];

  const values = [
    {
      icon: ShieldCheck,
      title: '100% Genuine Distributor Stock',
      description:
        'Every camera, lens, microphone, and accessory is sourced directly from certified authorized brand distributors with genuine Indian manufacturer warranty.',
    },
    {
      icon: Award,
      title: 'Creator-First Advisory',
      description:
        'We understand that finding the right focal length, payload capacity, or wireless audio latency matters. Our specialists help you choose the right gear for your production.',
    },
    {
      icon: Truck,
      title: 'Insured Pan-India Delivery',
      description:
        'High-value electronics require safe handling. All shipments are fully insured and packaged securely with trusted logistics partners across India.',
    },
    {
      icon: Headphones,
      title: 'Dedicated Post-Sale Support',
      description:
        'Need help setting up gimbal balancing, firmware updates, or warranty claims? Our team provides live technical assistance for your gear.',
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">About Us</span>
        </nav>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <Camera className="w-3.5 h-3.5" />
            <span>The Premier Camera & Creator Gear Destination</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-['Outfit'] text-foreground tracking-tight mb-6">
            Empowering India’s <span className="text-primary">Visual Creators</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Prem Electronics was established to solve a critical challenge for photographers, filmmakers, and digital creators: accessible, reliable, 100% authentic equipment backed by knowledgeable support.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 text-center shadow-xs"
            >
              <p className="text-3xl sm:text-4xl font-black text-primary font-['Outfit'] mb-1">
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Mission & Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 bg-muted/20 border border-border rounded-3xl p-8 sm:p-12">
          <div className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-foreground">
              Our Journey & Dedication
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based in Vadodara, Gujarat, Prem Electronics has grown from a specialized photography store into a trusted nationwide destination for camera bodies, cinema lenses, wireless stabilization, studio lighting, and pro audio gear.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Whether you are an independent documentary filmmaker, a wedding cinema specialist, or a studio creator, we ensure you receive genuine hardware with GST invoicing and authorized warranty support.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors"
              >
                <span>Contact Specialists</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
              <CheckCircle className="w-6 h-6 text-primary" />
              <h4 className="text-sm font-bold text-foreground">GST Invoicing</h4>
              <p className="text-xs text-muted-foreground">Full business GST input tax credit available on every order.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
              <Users className="w-6 h-6 text-primary" />
              <h4 className="text-sm font-bold text-foreground">B2B Studio Supply</h4>
              <p className="text-xs text-muted-foreground">Custom bulk procurement support for studios and agencies.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
              <Zap className="w-6 h-6 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Fast Dispatch</h4>
              <p className="text-xs text-muted-foreground">Orders verified and dispatched with expedited air couriers.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
              <Award className="w-6 h-6 text-primary" />
              <h4 className="text-sm font-bold text-foreground">Official Warranty</h4>
              <p className="text-xs text-muted-foreground">Hassle-free service with authorized brand centers across India.</p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-foreground mb-3">
              Why Creators Choose Prem Electronics
            </h2>
            <p className="text-xs text-muted-foreground">
              Built on transparency, authenticity, and technical excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl p-6 shadow-xs hover:border-primary/40 transition-colors space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold font-['Outfit'] text-foreground">
                    {v.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {v.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

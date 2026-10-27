import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  HelpCircle,
  Truck,
  ShieldCheck,
  CreditCard,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'orders' | 'warranty' | 'payments';
}

const FAQS: FAQItem[] = [
  {
    category: 'orders',
    question: 'How long does delivery take across India?',
    answer:
      'Most metro and tier-1 orders are delivered within 2 to 4 business days. Regional and rest of India orders typically take 4 to 6 business days. All shipments are fully insured and tracked with live tracking numbers sent via SMS/Email.',
  },
  {
    category: 'orders',
    question: 'Are high-value cameras and lenses safely packaged?',
    answer:
      'Yes. All camera bodies, lenses, and sensitive electronic equipment are shipped in reinforced tamper-evident outer packaging with multi-layer bubble wrap and shock-absorbing air pillows.',
  },
  {
    category: 'orders',
    question: 'Is shipping free?',
    answer:
      'We offer free insured delivery on all orders above ₹999. For orders below ₹999, a nominal standard shipping fee of ₹99 applies.',
  },
  {
    category: 'warranty',
    question: 'Are all products 100% original with official manufacturer warranty?',
    answer:
      'Yes, absolutely. Prem Electronics only retails genuine inventory sourced straight from certified Indian brand distributors. Each item contains authentic brand warranty cards and serial numbers registered for Indian service centers.',
  },
  {
    category: 'warranty',
    question: 'How do I claim a warranty if an issue arises?',
    answer:
      'You can visit any authorized brand service center across India with your Prem Electronics tax invoice. You can also contact our support team at support@premelectronics.com to assist with service center documentation.',
  },
  {
    category: 'payments',
    question: 'Can I get a GST Input Tax Credit invoice for my business?',
    answer:
      'Yes! During checkout, enter your business GSTIN and legal business name. Your generated tax invoice will include your GSTIN, allowing you to claim full input tax credit.',
  },
  {
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major Credit/Debit Cards (Visa, MasterCard, RuPay, Amex), Net Banking, UPI (Google Pay, PhonePe, Paytm), and Razorpay secure payment gateways.',
  },
];

export default function FAQ() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Frequently Asked Questions</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help & Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-['Outfit'] text-foreground tracking-tight mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Quick answers about shipping, genuine warranties, authorized gear, and GST invoicing for your camera gear.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions (e.g. warranty, delivery, GST)..."
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs transition-all"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Questions', icon: Sparkles },
            { id: 'orders', label: 'Orders & Shipping', icon: Truck },
            { id: 'warranty', label: 'Genuine Warranty', icon: ShieldCheck },
            { id: 'payments', label: 'Payments & GST', icon: CreditCard },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3 mb-16">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm text-foreground hover:text-primary transition-colors focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <span className="pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 text-muted-foreground ${
                        isExpanded ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/40 bg-muted/20"
                      >
                        <p className="p-5 text-xs text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-2xl p-8">
              <p className="text-sm font-semibold text-foreground mb-1">
                No matching questions found
              </p>
              <p className="text-xs text-muted-foreground">
                Try searching for another keyword or reach out directly to our specialists.
              </p>
            </div>
          )}
        </div>

        {/* Support Teaser */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <h3 className="text-lg font-bold font-['Outfit'] text-foreground">
            Still need assistance with your equipment?
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Our expert electronics team is available Monday to Saturday to answer queries on compatibility, shipping, or warranty.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Contact Us</span>
            </Link>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors"
            >
              <span>Call +91 98765 43210</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

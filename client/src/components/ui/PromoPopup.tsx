import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { hasSeenPromoAtom } from '../../store/promoAtom';
import { X, Tag, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PROMO_CODE = 'FIRSTORDER10';
const DELAY_MS = 3000;

export const PromoPopup = () => {
  const [hasSeen, setHasSeen] = useAtom(hasSeenPromoAtom);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasSeen) {
      const timer = setTimeout(() => setShow(true), DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [hasSeen]);

  const dismiss = () => {
    setShow(false);
    setHasSeen(true);
    localStorage.setItem('hasSeenPromo', 'true');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(PROMO_CODE).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const shop = () => { dismiss(); navigate('/shop'); };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4" onClick={dismiss}>
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-card rounded-3xl border border-border overflow-hidden shadow-2xl relative"
          >
            {/* Dismiss */}
            <button onClick={dismiss} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Banner gradient */}
            <div className="gradient-primary p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/30 rounded-full" />
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/20 rounded-full" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <p className="text-white/80 text-sm font-medium mb-1">🎉 Welcome to Prem Electronics!</p>
                <p className="text-white text-3xl font-black font-['Outfit']">10% OFF</p>
                <p className="text-white/80 text-sm mt-1">your first order</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm mb-4">Use the code at checkout to redeem your discount on any order above ₹999</p>

              <div className="flex items-center gap-2 bg-background rounded-xl p-3 border border-dashed border-primary/50 mb-4">
                <Tag className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="flex-1 font-mono text-base font-bold text-primary tracking-widest">{PROMO_CODE}</span>
                <button onClick={copyCode} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-lg font-semibold hover:bg-primary/20 transition-colors">
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>

              <button id="promo-shop-now" onClick={shop} className="w-full py-3 gradient-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                Shop Now →
              </button>
              <button onClick={dismiss} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                No thanks, I'll pay full price
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

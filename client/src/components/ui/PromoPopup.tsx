import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import { hasSeenPromoAtom } from "../../store/promoAtom";
import { X, Tag, Zap, Check, Copy, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PROMO_CODE = "FIRSTORDER10";
const DELAY_MS = 3000;

export const PromoPopup = () => {
  const [hasSeen, setHasSeen] = useAtom(hasSeenPromoAtom);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSeen) return;

    const timer = window.setTimeout(() => setShow(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasSeen]);

  const dismiss = () => {
    setShow(false);
    setHasSeen(true);

    try {
      localStorage.setItem("hasSeenPromo", "true");
    } catch {
      // The popup can still close if storage is unavailable.
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shop = () => {
    dismiss();
    navigate("/shop");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-title"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close promotional popup"
              title="Close"
              className="absolute right-4 top-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/20 text-white transition-all duration-200 hover:rotate-90 hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5 pointer-events-none" />
            </button>

            {/* Promotional header */}
            <div className="gradient-primary relative overflow-hidden px-6 pb-8 pt-9 text-center sm:px-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border-[24px] border-white/10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/10"
              />

              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg">
                  <Zap className="h-7 w-7 text-white" />
                </div>

                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  🎉 Welcome to Prem Electronics
                </p>

                <h2
                  id="promo-title"
                  className="font-['Outfit'] text-4xl font-black tracking-tight text-white sm:text-5xl"
                >
                  10% OFF
                </h2>

                <p className="mt-2 text-base font-medium text-white/90">
                  Your first order starts here.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                  <Tag className="h-3.5 w-3.5" />
                  First-order exclusive
                </div>
              </div>
            </div>

            {/* Popup content */}
            <div className="p-6 sm:p-8">
              <p className="mx-auto max-w-sm text-center text-sm leading-6 text-muted-foreground">
                Enjoy 10% off your first purchase. Apply this promo code at
                checkout on orders above ₹999.
              </p>

              {/* Promo code */}
              <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Tag className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Your discount code
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-bold tracking-wider text-foreground sm:text-base">
                      {PROMO_CODE}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Primary action */}
              <button
                id="promo-shop-now"
                type="button"
                onClick={shop}
                className="gradient-primary mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-xl active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={dismiss}
                className="mt-4 w-full cursor-pointer rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                No thanks, maybe later
              </button>

              <p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">
                Offer applies to eligible first orders above ₹999.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

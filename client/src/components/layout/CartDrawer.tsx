import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartDrawerOpenAtom } from "../../store/cartAtom";
import { userAtom } from "../../store/userAtom";
import { useCart } from "../../hooks/useCart";
import { getProductThumbnailUrl } from "../../lib/image";

export const CartDrawer = () => {
  const [open, setOpen] = useAtom(cartDrawerOpenAtom);
  const user = useAtomValue(userAtom);
  const { cartItems, itemCount, subtotal, removeFromCart, updateQuantity } =
    useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && !user) {
      setOpen(false);
    }
  }, [open, user, setOpen]);

  if (!user) return null;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(p);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white text-zinc-900 shadow-2xl border-l border-zinc-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 bg-white">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold font-['Outfit'] text-zinc-900">
                  Cart{" "}
                  <span className="text-zinc-500 font-normal text-sm">
                    ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <ShoppingBag className="w-16 h-16 text-zinc-300" />
                  <p className="text-zinc-500">Your cart is empty</p>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/shop");
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-3 p-3 bg-white rounded-xl border border-zinc-200 shadow-xs"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100">
                      {item.image ? (
                        <img
                          src={getProductThumbnailUrl(item.image)}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.salePrice && (
                          <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(parseFloat(item.price))}
                          </span>
                        )}
                        <span className="text-sm font-bold text-primary">
                          {formatPrice(
                            parseFloat(item.salePrice ?? item.price),
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-zinc-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1.5 text-zinc-400 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-zinc-200 space-y-3 bg-white">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-bold text-lg text-zinc-900 font-['Outfit']">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Taxes and shipping calculated at checkout
                </p>
                <button
                  id="proceed-to-checkout-btn"
                  onClick={() => {
                    setOpen(false);
                    navigate("/checkout");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/shop"
                  onClick={() => setOpen(false)}
                  className="block text-center text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

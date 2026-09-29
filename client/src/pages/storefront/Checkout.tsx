import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Shield, Tag, Truck, ChevronRight } from 'lucide-react';
import { api } from '../../api/axiosClient';
import { useCart } from '../../hooks/useCart';
import { useAtomValue } from 'jotai';
import { userAtom } from '../../store/userAtom';
import type { Address, CartValidationResult } from '../../types';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

const loadRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const formatPrice = (p: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p);

export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const user = useAtomValue(userAtom);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState({
    fullName: user?.name ?? '',
    phone: user?.phone ?? '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [useNewAddress, setUseNewAddress] = useState(false);

  // Fetch saved addresses
  const { data: addressesRes } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<Address[]>('/users/addresses'),
    enabled: !!user,
  });
  const addresses = addressesRes?.data ?? [];

  // Cart validation
  const validateMutation = useMutation({
    mutationFn: () =>
      api.post<CartValidationResult>('/cart/validate', {
        items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: appliedCoupon || undefined,
      }),
  });

  const cart = validateMutation.data?.data;

  // Apply coupon
  const handleApplyCoupon = () => {
    setAppliedCoupon(couponCode.toUpperCase());
    validateMutation.mutate();
    toast.success(`Coupon "${couponCode.toUpperCase()}" applied!`);
  };

  // Refresh validation on mount
  useState(() => { validateMutation.mutate(); });

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    if (!cart) { toast.error('Please validate your cart first.'); return; }

    const shippingAddress =
      useNewAddress || !selectedAddressId
        ? newAddress
        : undefined;

    const shippingAddressId = !useNewAddress && selectedAddressId ? selectedAddressId : undefined;

    if (!shippingAddress && !shippingAddressId) {
      toast.error('Please select or enter a shipping address.');
      return;
    }

    try {
      // Create order
      const orderRes = await api.post<{
        orderId: string;
        orderNumber: string;
        razorpayOrderId: string;
        amount: number;
      }>('/orders', {
        items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddressId,
        shippingAddress: shippingAddress ? shippingAddress : undefined,
        couponCode: appliedCoupon || undefined,
      });

      const { razorpayOrderId, amount, orderId, orderNumber } = orderRes.data;

      // In development / test mode with placeholder credentials
      if (RAZORPAY_KEY === 'rzp_test_example' || razorpayOrderId.startsWith('order_')) {
        toast.info('Simulating payment (development test mode)...');
        try {
          await api.post('/payments/verify', {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: 'mock_signature',
          });
          clearCart();
          toast.success('Order placed successfully! 🎉');
          navigate(`/order-success/${orderId}`);
          return;
        } catch (verifyErr: any) {
          toast.error(verifyErr?.message || 'Payment verification failed.');
          return;
        }
      }

      // Load Razorpay
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Failed to load payment gateway. Please try again.'); return; }

      const options = {
        key: RAZORPAY_KEY,
        amount,
        currency: 'INR',
        name: 'Prem Electronics',
        description: `Order ${orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone ?? '',
        },
        theme: { color: '#3b82f6' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCart();
            toast.success('Payment successful! 🎉');
            navigate(`/order-success/${orderId}`);
          } catch (err: any) {
            toast.error(err?.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => toast.info('Payment cancelled.'),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create order. Please try again.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-black font-['Outfit'] mb-4">Your cart is empty</h1>
        <button onClick={() => navigate('/shop')} className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black font-['Outfit'] mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left: Address & Coupon */}
        <div className="lg:col-span-3 space-y-6">
          {/* Shipping Address */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold font-['Outfit'] mb-4">Shipping Address</h2>

            {addresses.length > 0 && (
              <div className="space-y-3 mb-4">
                {addresses.map((addr) => (
                  <label key={addr.id}
                    className={clsx('flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors',
                      selectedAddressId === addr.id && !useNewAddress
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50')}>
                    <input type="radio" name="address" value={addr.id}
                      checked={selectedAddressId === addr.id && !useNewAddress}
                      onChange={() => { setSelectedAddressId(addr.id); setUseNewAddress(false); }}
                      className="mt-1 accent-blue-500" />
                    <div>
                      <p className="font-medium text-sm">{addr.fullName} <span className="text-xs text-muted-foreground ml-2">{addr.phone}</span></p>
                      <p className="text-sm text-muted-foreground">{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
                      {addr.isDefault && <span className="text-xs text-green-400 font-medium">Default</span>}
                    </div>
                  </label>
                ))}
                <button onClick={() => { setUseNewAddress(true); setSelectedAddressId(''); }}
                  className={clsx('w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors',
                    useNewAddress ? 'border-primary bg-primary/5 text-primary' : 'border-dashed border-border text-muted-foreground hover:border-primary/50')}>
                  + Add a new address
                </button>
              </div>
            )}

            {(useNewAddress || addresses.length === 0) && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'fullName', label: 'Full Name', span: 2 },
                  { key: 'phone', label: 'Phone Number', span: 1 },
                  { key: 'pincode', label: 'Pincode', span: 1 },
                  { key: 'street', label: 'Street Address', span: 2 },
                  { key: 'city', label: 'City', span: 1 },
                  { key: 'state', label: 'State', span: 1 },
                ].map(({ key, label, span }) => (
                  <div key={key} className={`col-span-${span}`}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                    <input type="text" value={newAddress[key as keyof typeof newAddress]}
                      onChange={(e) => setNewAddress({ ...newAddress, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coupon */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold font-['Outfit'] mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Apply Coupon
            </h2>
            <div className="flex gap-3">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button onClick={handleApplyCoupon} disabled={!couponCode}
                className="px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all">
                Apply
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Try: <span className="font-mono text-primary">WELCOME10</span> · <span className="font-mono text-primary">FLAT500</span> · <span className="font-mono text-primary">PREM20</span></p>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold font-['Outfit'] mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image && <img src={item.image} alt={item.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatPrice(Number(item.salePrice ?? item.price) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              {cart ? (
                <>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
                  {cart.discount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Discount</span><span>-{formatPrice(cart.discount)}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Shipping</span><span>{cart.shipping === 0 ? <span className="text-green-400">FREE</span> : formatPrice(cart.shipping)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST (18%)</span><span>{formatPrice(cart.tax)}</span></div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-border mt-2">
                    <span>Total</span>
                    <span className="gradient-text text-lg">{formatPrice(cart.total)}</span>
                  </div>
                </>
              ) : (
                <button onClick={() => validateMutation.mutate()}
                  className="w-full py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors">
                  {validateMutation.isPending ? 'Calculating...' : 'Calculate Total'}
                </button>
              )}
            </div>

            <motion.button
              id="pay-now-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckout}
              className="w-full mt-4 py-4 gradient-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
            >
              <Shield className="w-4 h-4" />
              Pay Securely with Razorpay
              <ChevronRight className="w-4 h-4" />
            </motion.button>

            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> 256-bit SSL encrypted • RBI compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

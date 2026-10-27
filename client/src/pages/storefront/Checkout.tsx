import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Shield, Tag, Truck, ChevronRight, Building2 } from 'lucide-react';
import { api } from '../../api/axiosClient';
import { useCart } from '../../hooks/useCart';
import { useAtomValue } from 'jotai';
import { userAtom } from '../../store/userAtom';
import type { Address, BusinessProfile, CartValidationResult } from '../../types';
import { BusinessProfileForm } from '../../components/shared/BusinessProfileForm';
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
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'personal' | 'company'>('personal');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [authorizedRepresentative, setAuthorizedRepresentative] = useState(false);
  const [purchaseOrderReference, setPurchaseOrderReference] = useState('');
  const [showBusinessForm, setShowBusinessForm] = useState(false);

  // Fetch saved addresses
  const { data: addressesRes } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<Address[]>('/users/addresses'),
    enabled: !!user,
  });
  const addresses = useMemo(() => addressesRes?.data ?? [], [addressesRes?.data]);
  const { data: businessesRes } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get<BusinessProfile[]>('/businesses'),
    enabled: !!user,
  });
  const businesses = useMemo(() => businessesRes?.data ?? [], [businessesRes?.data]);
  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0 && !useNewAddress) {
      setSelectedAddressId(addresses.find((address) => address.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, selectedAddressId, useNewAddress]);
  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) setSelectedBusinessId(businesses.find((business) => business.isDefault)?.id ?? businesses[0].id);
  }, [businesses, selectedBusinessId]);

  // Cart validation
  const validateMutation = useMutation({
    mutationFn: (code?: string) =>
      api.post<CartValidationResult>('/cart/validate', {
        items: cartItems.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        couponCode: code || undefined,
        purchaseType,
      }),
  });

  const cart = validateMutation.data?.data;

  // Apply coupon
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    validateMutation.mutate(code, {
      onSuccess: () => { setAppliedCoupon(code); toast.success(`Coupon "${code}" applied!`); },
      onError: (error: { message?: string }) => toast.error(error.message ?? 'Coupon could not be applied.'),
    });
  };

  useEffect(() => {
    if (cartItems.length > 0) validateMutation.mutate(appliedCoupon || undefined);
    // Recalculate whenever the authoritative cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, appliedCoupon, purchaseType]);

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    if (!cart) { toast.error('Please validate your cart first.'); return; }

    let shippingAddress =
      useNewAddress || !selectedAddressId
        ? newAddress
        : undefined;

    let shippingAddressId = !useNewAddress && selectedAddressId ? selectedAddressId : undefined;

    if (!shippingAddress && !shippingAddressId) {
      toast.error('Please select or enter a shipping address.');
      return;
    }
    if (purchaseType === 'company' && !selectedBusinessId) {
      toast.error('Select or add a verified business profile.');
      return;
    }
    if (purchaseType === 'company' && !authorizedRepresentative) {
      toast.error('Confirm that you are authorized to purchase for this business.');
      return;
    }

    try {
      if (shippingAddress && saveNewAddress) {
        const saved = await api.post<Address>('/users/addresses', { ...shippingAddress, type: 'shipping', isDefault: addresses.length === 0 });
        shippingAddressId = saved.data.id;
        shippingAddress = undefined;
      }
      // Create order
      const orderRes = await api.post<{
        orderId: string;
        orderNumber: string;
        razorpayOrderId: string;
        amount: number;
        mockPayment: boolean;
      }>('/orders', {
        items: cartItems.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddressId,
        shippingAddress: shippingAddress ? shippingAddress : undefined,
        couponCode: appliedCoupon || undefined,
        purchaseType,
        businessProfileId: purchaseType === 'company' ? selectedBusinessId : undefined,
        authorizedRepresentative: purchaseType === 'company' ? true : undefined,
        purchaseOrderReference: purchaseType === 'company' && purchaseOrderReference.trim() ? purchaseOrderReference.trim() : undefined,
        taxScenario: 'ordinary_goods_movement',
      });

      const { razorpayOrderId, amount, orderId, orderNumber, mockPayment } = orderRes.data;

      // Mock checkout is available only when the server explicitly enables it outside production.
      if (mockPayment) {
        toast.info('Simulating payment (development test mode)...');
        try {
          await api.post('/payments/verify', {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: `mock_payment_${Date.now()}`,
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
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold font-['Outfit'] mb-4">Purchase type</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setPurchaseType('personal')} className={clsx('text-left p-4 rounded-xl border', purchaseType === 'personal' ? 'border-primary bg-primary/5' : 'border-border')}><span className="font-semibold block">Personal purchase</span><span className="text-xs text-muted-foreground">No GSTIN required</span></button>
              <button type="button" onClick={() => setPurchaseType('company')} className={clsx('text-left p-4 rounded-xl border', purchaseType === 'company' ? 'border-primary bg-primary/5' : 'border-border')}><span className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Company purchase</span><span className="text-xs text-muted-foreground">Invoice to a verified GST registration</span></button>
            </div>
            {purchaseType === 'company' && <div className="mt-4 space-y-3">
              {businesses.map((business) => <label key={business.id} className={clsx('block p-4 rounded-xl border cursor-pointer', selectedBusinessId === business.id ? 'border-primary bg-primary/5' : 'border-border')}>
                <div className="flex gap-3"><input type="radio" name="business" checked={selectedBusinessId === business.id} onChange={() => setSelectedBusinessId(business.id)} /><div><p className="font-semibold text-sm">{business.nickname || business.tradeName || business.legalName}</p><p className="text-xs text-muted-foreground">{business.legalName} · <span className="font-mono">{business.gstin}</span></p><p className="text-xs text-muted-foreground mt-1">Bill to: {business.billingAddress.city}, {business.billingAddress.state} – {business.billingAddress.pincode}</p></div></div>
              </label>)}
              <button type="button" onClick={() => setShowBusinessForm((value) => !value)} className="text-sm text-primary font-medium">+ Fetch and save another GSTIN</button>
              {showBusinessForm && <div className="rounded-xl border border-border p-4"><BusinessProfileForm onSaved={(profile) => { setSelectedBusinessId(profile.id); setShowBusinessForm(false); }} /></div>}
              <input value={purchaseOrderReference} onChange={(e) => setPurchaseOrderReference(e.target.value)} placeholder="Purchase order / reference (optional)" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm" />
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={authorizedRepresentative} onChange={(e) => setAuthorizedRepresentative(e.target.checked)} className="mt-1" /><span>I confirm the business and billing details and acknowledge that I am authorized to purchase on its behalf.</span></label>
              <p className="text-xs text-muted-foreground">Registered identity, invoice billing address, and delivery address remain separate. This flow supports ordinary domestic goods movement only.</p>
            </div>}
          </div>

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
                  <div key={key} className={span === 2 ? 'col-span-2' : 'col-span-1'}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                    <input type="text" value={newAddress[key as keyof typeof newAddress]}
                      onChange={(e) => setNewAddress({ ...newAddress, [key]: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                ))}
                <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={saveNewAddress} onChange={(event) => setSaveNewAddress(event.target.checked)} /> Save this address to my account</label>
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
                <div key={item.variantId ?? item.productId} className="flex items-center gap-3">
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
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST ({cart.taxBreakdown.mode})</span><span>{formatPrice(cart.tax)}</span></div>
                  {cart.taxBreakdown.cgstMinor > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>CGST</span><span>{formatPrice(cart.taxBreakdown.cgstMinor / 100)}</span></div>}
                  {cart.taxBreakdown.sgstMinor > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>SGST / UTGST</span><span>{formatPrice(cart.taxBreakdown.sgstMinor / 100)}</span></div>}
                  {cart.taxBreakdown.igstMinor > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>IGST</span><span>{formatPrice(cart.taxBreakdown.igstMinor / 100)}</span></div>}
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
              {purchaseType === 'company' ? 'Pay for Company Order' : 'Pay Securely with Razorpay'}
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

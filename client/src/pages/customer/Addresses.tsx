import { MapPin } from 'lucide-react';
export default function Addresses() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black font-['Outfit'] mb-4 flex items-center gap-2">
        <MapPin className="w-7 h-7 text-primary" /> My Addresses
      </h1>
      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
        Address management — add addresses during checkout.
      </div>
    </div>
  );
}

import { useAtomValue } from 'jotai';
import { userAtom } from '../../store/userAtom';
import { Link } from 'react-router-dom';
import { User, Package, MapPin, ArrowRight } from 'lucide-react';

export default function Account() {
  const user = useAtomValue(userAtom);
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-black font-['Outfit'] mb-8">My Account</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border p-6 col-span-full">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-black text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold font-['Outfit']">{user.name}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium capitalize">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {[
          { icon: Package, title: 'My Orders', desc: 'View and track your orders', href: '/account/orders' },
          { icon: MapPin, title: 'Saved Addresses', desc: 'Manage your delivery addresses', href: '/account/addresses' },
          { icon: User, title: 'Profile Settings', desc: 'Update your personal information', href: '/account/profile' },
        ].map(({ icon: Icon, title, desc, href }) => (
          <Link key={href} to={href}
            className="group bg-card rounded-2xl border border-border p-6 card-glow flex flex-col gap-3 hover:border-primary/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}

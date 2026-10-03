
import { Link } from 'react-router-dom';
import { Store, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export const AdminHeader = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center px-6 gap-4">
        <div className="flex-1" />

        <div className="flex items-center gap-4">
          <Link to="/">
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-card transition-colors">
              <Store className="w-4 h-4" />
              Storefront
            </button>
          </Link>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="flex items-center gap-3 hover:bg-muted p-1 rounded-full transition-colors focus:outline-none">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={user?.avatarUrl || ''} alt={user?.name || 'Admin'} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {user?.name?.[0]?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{user?.name || 'Admin User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'admin@example.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout.mutate()} className="text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-500/10 dark:focus:text-red-400 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

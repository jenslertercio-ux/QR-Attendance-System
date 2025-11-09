import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Moon, Sun, Upload, User, Settings, LogOut, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onLogoUpload?: (file: File) => void;
}

export const Header = ({ 
  userName = "Admin User", 
  userEmail = "admin@qrattendance.com",
  userAvatar,
  onLogoUpload 
}: HeaderProps) => {
  const [logo, setLogo] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedLogo = localStorage.getItem('app-logo');
    if (storedLogo) {
      setLogo(storedLogo);
    }
  }, []);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogo(result);
        localStorage.setItem('app-logo', result);
        toast.success('Logo uploaded successfully');
        onLogoUpload?.(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoClick = () => {
    document.getElementById('logo-upload')?.click();
  };

  if (!mounted) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div 
            onClick={handleLogoClick}
            className="group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-all hover:border-primary hover:bg-muted hover-scale"
            title="Click to upload logo"
          >
            {logo ? (
              <img 
                src={logo} 
                alt="Logo" 
                className="h-full w-full rounded-lg object-contain p-1"
              />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Brand Name */}
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight">QR Attendance</h1>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>

        {/* Navigation Menu - Hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6">
          <a 
            href="#dashboard" 
            className="text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Dashboard
          </a>
          <a 
            href="#scanner" 
            className="text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Scanner
          </a>
          <a 
            href="#records" 
            className="text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Records
          </a>
          <a 
            href="#reports" 
            className="text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
          >
            Reports
          </a>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications - Hidden on mobile */}
          <Button variant="ghost" size="icon" className="hidden sm:flex hover-scale">
            <Bell className="h-5 w-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hover-scale"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all" />
            ) : (
              <Moon className="h-5 w-5 rotate-0 scale-100 transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover-scale">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 animate-scale-in" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
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

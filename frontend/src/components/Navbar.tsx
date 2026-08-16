'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, GitBranch, Layers, User, Plus, Menu, X, RotateCcw, LogOut, ChevronDown } from 'lucide-react';
import { resetDevData } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].some(r => pathname === r || pathname.startsWith('/reset-password'));

  if (isAuthRoute) {
    return (
      <header className="py-6 px-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-white">SkillProof</span>
        </Link>
      </header>
    );
  }

  const navLinks = [
    { name: 'Tracker', href: '/', icon: LayoutDashboard },
    { name: 'Repo Audit', href: '/repos', icon: GitBranch },
    { name: 'Skill Matrix', href: '/skills', icon: Layers },
    { name: 'Master Profile', href: '/profile', icon: User },
  ];

  const handleResetData = async () => {
    if (confirm('Are you sure you want to reset all candidate data? This will clear all profiles, repos, skills, and applications.')) {
      setResetting(true);
      try {
        await resetDevData();
        router.push('/');
        window.location.reload();
      } catch (err) {
        console.error('Failed to reset data:', err);
      } finally {
        setResetting(false);
      }
    }
  };

  const userInitials = user?.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email ? user.email[0].toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-black tracking-tight text-white">
              SkillProof
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
              Depth Auditor
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accent/15 text-white border border-accent/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-surface/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-gray-400'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons & Authenticated User Menu */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleResetData}
            disabled={resetting}
            title="Reset to 0 candidate data"
            className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all text-xs flex items-center space-x-1"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline text-[11px]">Reset Data</span>
          </button>

          <Link
            href="/applications/new"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-md shadow-accent/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Application</span>
          </Link>

          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-xs font-medium text-gray-200 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 text-accent font-bold text-xs flex items-center justify-center">
                {userInitials}
              </div>
              <span className="hidden md:inline max-w-[120px] truncate">{user?.full_name || user?.email?.split('@')[0]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl glass-card border border-surface-border shadow-2xl py-1 z-50 text-xs">
                <div className="px-4 py-2.5 border-b border-surface-border">
                  <p className="font-semibold text-white truncate">{user?.full_name || 'Authenticated User'}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-surface/80"
                >
                  <User className="w-4 h-4 text-accent" />
                  <span>Master Profile</span>
                </Link>
                <button
                  onClick={() => { setUserDropdownOpen(false); logout(); }}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-surface border border-surface-border"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-1 bg-surface border-b border-surface-border">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-accent/20 text-white border border-accent/40'
                    : 'text-gray-300 hover:bg-surface-border/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : ''}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}



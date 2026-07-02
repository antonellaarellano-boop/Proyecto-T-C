'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  History,
  Settings,
  Menu,
  X,
  KanbanSquare,
  BookMarked,
  DollarSign,
  Megaphone,
  Clock,
  CalendarHeart,
  HeartPulse,
  Wallet,
  Receipt,
  Coins,
  Building2,
  Dices,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  section?: string;
}

const navItems: NavItem[] = [
  // Reclutamiento
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard, section: 'Reclutamiento' },
  { href: '/dashboard/candidatos', label: 'Candidatos', icon: Users, section: 'Reclutamiento' },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: KanbanSquare, section: 'Reclutamiento' },
  { href: '/dashboard/vacantes', label: 'Vacantes', icon: Briefcase, section: 'Reclutamiento' },
  { href: '/dashboard/fuentes', label: 'Fuentes', icon: Megaphone, section: 'Reclutamiento' },
  { href: '/dashboard/rango-salarial', label: 'Rango salarial', icon: DollarSign, section: 'Reclutamiento' },
  { href: '/dashboard/tiempo-revision', label: 'Tiempo de revisión', icon: Clock, section: 'Reclutamiento' },

  // Engagement & Cultura
  { href: '/dashboard/engagement', label: 'Eventos', icon: CalendarHeart, section: 'Engagement' },
  { href: '/dashboard/engagement/gastos', label: 'Gastos por actividades del mes', icon: Coins, section: 'Engagement' },

  // Bienestar & Salud
  { href: '/dashboard/bienestar', label: 'Exámenes médicos', icon: HeartPulse, section: 'Bienestar & Salud' },

  // Pagos
  { href: '/dashboard/pagos', label: 'Pagos fijos', icon: Wallet, section: 'Pagos' },
  { href: '/dashboard/pagos/rhe', label: 'RHE', icon: Receipt, section: 'Pagos' },

  // Sitios — datos en vivo de reserva de escritorios (Desk Buddy / Supabase)
  { href: '/dashboard/sitios', label: 'Sitios', icon: Building2, section: 'Sitios' },
  { href: '/dashboard/sitios/anteriores', label: 'Reservas anteriores', icon: History, section: 'Sitios' },

  // Juegos de mesa — datos en vivo de reserva de juegos de la oficina (Supabase)
  { href: '/dashboard/juegos', label: 'Reservas de juegos', icon: Dices, section: 'Juegos de mesa' },

  // Colaboradores (último módulo antes de Administración)
  { href: '/dashboard/colaboradores', label: 'Datos', icon: Users, section: 'Colaboradores' },

  // Talento & Desarrollo (Próximamente)
  // { href: '/dashboard/onboarding', label: 'Onboarding', icon: CheckCircle2, section: 'Talento & Desarrollo' },
  // { href: '/dashboard/desarrollo', label: 'Desarrollo', icon: TrendingUp, section: 'Talento & Desarrollo' },
  // { href: '/dashboard/evaluacion', label: 'Evaluación', icon: Star, section: 'Talento & Desarrollo' },
  
  // Administración
  { href: '/dashboard/actividad', label: 'Actividad', icon: History, section: 'Administración' },
  { href: '/dashboard/catalogos', label: 'Catálogos', icon: BookMarked, section: 'Administración' },
  { href: '/dashboard/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin'], section: 'Administración' },
  { href: '/dashboard/ajustes', label: 'Ajustes', icon: Settings, section: 'Administración' },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  // Match más específico: el href más largo que sea prefijo del pathname gana
  // (evita que /dashboard/merch quede activo estando en /dashboard/merch/usos).
  const activeHref = React.useMemo(() => {
    const matches = navItems
      .map((i) => i.href)
      .filter((h) => pathname === h || pathname.startsWith(h + '/'));
    return matches.sort((a, b) => b.length - a.length)[0];
  }, [pathname]);
  const [open, setOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    'Reclutamiento': true, // Reclutamiento expandido por defecto
  });

  const items = navItems.filter((it) => !it.roles || it.roles.includes(role));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="fixed left-4 top-4 z-40 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/80 shadow-soft backdrop-blur lg:hidden"
        aria-label="Abrir menu"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-72 transform border-r border-border bg-card transition-transform duration-300 ease-out lg:translate-x-0',
          open ? 'translate-x-0 shadow-card-elevated lg:shadow-none' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo variant="mark" size={32} />
              <div className="flex flex-col leading-tight">
                <span className="font-display text-base font-bold tracking-tight">
                  Baldecash
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                  Talento & Cultura
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 scrollbar-thin">
            {Object.entries(
              items.reduce(
                (acc, item) => {
                  const section = item.section || 'Otros';
                  if (!acc[section]) acc[section] = [];
                  acc[section].push(item);
                  return acc;
                },
                {} as Record<string, typeof items>,
              ),
            ).map(([section, sectionItems], sectionIdx) => {
              const isExpanded = expandedSections[section] ?? true;
              
              return (
                <div key={section}>
                  {sectionIdx > 0 && <div className="my-3 border-t border-border" />}
                  
                  {/* Section Header (Accordion Toggle) */}
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section}
                    </p>
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </motion.div>
                  </button>

                  {/* Section Items (Expandable) */}
                  <motion.div
                    initial={false}
                    animate={{ 
                      height: isExpanded ? 'auto' : 0,
                      opacity: isExpanded ? 1 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {sectionItems.map((item, i) => {
                      const active = item.href === activeHref;
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                              active
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                            )}
                          >
                            {active && (
                              <motion.div
                                layoutId="sidebar-active"
                                className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand-blue-100 to-brand-aqua-100 dark:from-brand-blue-600/20 dark:to-brand-aqua-600/20"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <Icon
                              className={cn(
                                'relative h-4 w-4 transition-transform group-hover:scale-110',
                                active && 'text-primary',
                              )}
                            />
                            <span className="relative">{item.label}</span>
                            {active && (
                              <motion.span
                                layoutId="sidebar-dot"
                                className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-glow"
                              />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-border p-4">
            <div className="rounded-xl border border-border bg-gradient-to-br from-brand-blue-100 to-brand-aqua-100 dark:from-brand-blue-600/15 dark:to-brand-aqua-600/15 p-4">
              <p className="text-xs font-semibold text-brand-blue-700 dark:text-brand-blue-100">
                🚀 Próximamente
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Onboarding, Desarrollo, Evaluación, Planes de Carrera y más módulos de Talento.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-brand-blue-700/30 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  );
}

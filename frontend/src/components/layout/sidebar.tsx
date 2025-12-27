"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Users,
    Bell,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    MessageSquare,
    Bot,
    Table,
    Menu,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Resumen", href: "/", icon: LayoutDashboard },
    { name: "Leads", href: "/leads", icon: Table },
    { name: "Inbox", href: "/inbox", icon: MessageSquare },
    { name: "Automatizaciones", href: "/automations", icon: Bot },
    { name: "Pipeline", href: "/pipeline", icon: BarChart3 },
    { name: "Asesores", href: "/advisors", icon: Users },
    { name: "Alertas", href: "/alerts", icon: Bell },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const NavContent = () => (
        <>
            <div className="flex h-16 items-center px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        DREAMBUILT OS
                    </span>
                </div>
            </div>

            <nav className="flex-1 space-y-1.5 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border/50 p-4 space-y-2">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200">
                    <Settings className="h-5 w-5" />
                    Configuración
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">DREAMBUILT OS</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex h-full w-64 flex-col border-r border-border bg-card/50 backdrop-blur-md sticky top-0">
                <NavContent />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Sidebar Content */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 transform bg-background transition-transform duration-300 ease-in-out lg:hidden border-r border-border",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <NavContent />
            </div>
            
            {/* Spacer for Mobile Header */}
            <div className="lg:hidden h-16 w-full shrink-0" />
        </>
    );
}

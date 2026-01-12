"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Users,
    Bell,
    LayoutDashboard,
    Settings,
    MessageSquare,
    Bot,
    Table,
    Menu,
    X,
    Building
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Resumen", href: "/", icon: LayoutDashboard },
    { name: "Leads", href: "/leads", icon: Table },
    { name: "Propiedades", href: "/properties", icon: Building },
    { name: "Inbox", href: "/inbox", icon: MessageSquare },
    { name: "Automatizaciones", href: "/automations", icon: Bot },
    { name: "Pipeline", href: "/pipeline", icon: BarChart3 },
    { name: "Asesores", href: "/advisors", icon: Users },
    { name: "Meta Analist", href: "/marketing", icon: BarChart3 },
    { name: "Alertas", href: "/alerts", icon: Bell },
];

const NavContent = ({ pathname, setIsOpen }: { pathname: string, setIsOpen: (open: boolean) => void }) => (
    <>
        <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-3">
                <Image 
                    src="/Logo-Dreambuilt OS.png" 
                    alt="DREAMBUILT OS" 
                    width={160} 
                    height={40} 
                    className="h-8 w-auto object-contain"
                />
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

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Image 
                        src="/Logo-Dreambuilt OS.png" 
                        alt="DREAMBUILT OS" 
                        width={140} 
                        height={35} 
                        className="h-7 w-auto object-contain"
                    />
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
                <NavContent pathname={pathname} setIsOpen={setIsOpen} />
            </div>

            {/* Mobile Sidebar Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            <div className={cn(
                "fixed inset-y-0 left-0 z-[70] w-72 bg-background border-r border-border transition-transform duration-300 ease-in-out lg:hidden",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <NavContent pathname={pathname} setIsOpen={setIsOpen} />
            </div>
            
            {/* Spacer for Mobile Header */}
            <div className="lg:hidden h-16 w-full shrink-0" />
        </>
    );
}
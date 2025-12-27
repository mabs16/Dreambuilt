"use client";

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
    Table
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

    return (
        <div className="flex h-full w-64 flex-col border-r border-border bg-card/50 backdrop-blur-md">
            <div className="flex h-16 items-center px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">DREAMBUILT OS</span>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 shrink-0",
                                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border p-4">
                <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Settings className="h-5 w-5" />
                    Configuración
                </button>
            </div>
        </div>
    );
}

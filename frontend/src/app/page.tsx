"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    topAdvisors: [] as any[],
    recentEvents: [] as any[],
    loading: true
  });

  useEffect(() => {
    async function fetchData() {
      // 1. Total Leads
      const { count: leadCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // 2. Top Advisors
      const { data: topAdvisors } = await supabase
        .from('advisors')
        .select('*')
        .order('score', { ascending: false })
        .limit(3);

      // 3. Recent Events
      const { data: recentEvents } = await supabase
        .from('events')
        .select(`
          *,
          leads(name),
          advisors(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalLeads: leadCount || 0,
        topAdvisors: topAdvisors || [],
        recentEvents: (recentEvents || []).map(e => ({
          ...e,
          leadName: e.leads?.name,
          advisorName: e.advisors?.name,
          time: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })),
        loading: false
      });
    }

    fetchData();
  }, []);

  if (stats.loading) return <div className="p-8">Cargando tablero...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-outfit">Control Tower</h1>
        <p className="text-muted-foreground">Monitorización en tiempo real de DREAMBUILT OS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Leads Totales"
          value={stats.totalLeads.toString()}
          change="+0%"
          icon={Users}
        />
        <StatCard
          title="Tasa de Cierre"
          value="0%"
          change="+0%"
          icon={TrendingUp}
        />
        <StatCard
          title="Cumplimiento SLA"
          value="100%"
          change="+0%"
          icon={CheckCircle2}
        />
        <StatCard
          title="Tiempo Promedio"
          value="--m"
          change="new"
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border border-border bg-card/30 p-6 glass">
          <h2 className="text-xl font-semibold mb-4 text-font-outfit">Actividad Reciente</h2>
          <div className="space-y-4">
            {stats.recentEvents.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground italic">
                Esperando datos de eventos...
              </div>
            ) : (
              stats.recentEvents.map((event, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm p-2 rounded hover:bg-white/5 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <span className="font-bold text-primary">{event.type}</span>
                    <span className="text-muted-foreground"> - </span>
                    <span>{event.leadName || 'Lead'}</span>
                    <span className="text-muted-foreground text-xs block">
                      {event.time} • Por {event.advisorName || 'Sistema'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="col-span-3 rounded-xl border border-border bg-card/30 p-6 glass">
          <h2 className="text-xl font-semibold mb-4 text-font-outfit">Mejores Asesores</h2>
          <div className="space-y-4">
            {stats.topAdvisors.map((advisor, i) => (
              <div key={advisor.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <span className="font-medium text-sm">{advisor.name}</span>
                </div>
                <span className="text-emerald-500 font-bold">{advisor.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon }: any) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-6 glass transition-all hover:border-primary/50">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold">{value}</p>
        <span className={cn(
          "text-xs font-semibold",
          change.startsWith("+") ? "text-emerald-500" : "text-rose-500"
        )}>
          {change}
        </span>
      </div>
    </div>
  );
}

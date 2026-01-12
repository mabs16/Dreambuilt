import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative overflow-y-auto no-scrollbar bg-background focus:outline-none">
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-4 sm:px-6 md:py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

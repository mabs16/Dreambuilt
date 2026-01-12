"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Send,
    User,
    MessageCircle,
    RefreshCw,
    CheckCheck,
    ArrowLeft,
    Paperclip,
    Smile,
    Phone,
    MoreVertical,
    ChevronDown,
    Filter
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    const normalized = (dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.match(/-[0-9]{2}:[0-9]{2}$/))) 
        ? dateStr 
        : `${dateStr.replace(' ', 'T')}Z`;
    return new Date(normalized);
};

interface ChatContact {
    contact: string;
    name?: string;
    lastMessage: string;
    timestamp: string;
    avatar?: string;
    is_advisor?: boolean;
}

interface Message {
    id: number;
    from: string;
    to: string;
    body: string;
    direction: 'inbound' | 'outbound';
    createdAt: string;
}

function InboxContent() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [chats, setChats] = useState<ChatContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("Todos");
    const [refreshing, setRefreshing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastContactRef = useRef<string | null>(null);
    const searchParams = useSearchParams();
    const chatParam = searchParams.get('chat');
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showMobileHistory, setShowMobileHistory] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (chatParam) {
            setSelectedContact(chatParam);
            setShowMobileHistory(true);
        }
    }, [chatParam]);

    const fetchChats = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/api/whatsapp/messages`);
            if (!res.ok) throw new Error("Failed to fetch chats");
            const data = await res.json();
            setChats(data || []);
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [apiUrl]);

    const fetchHistory = useCallback(async (phone: string) => {
        try {
            const res = await fetch(`${apiUrl}/api/whatsapp/messages/${phone}`);
            if (!res.ok) throw new Error("Failed to fetch history");
            const data = await res.json();
            setMessages(data);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchChats();
        const interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, [fetchChats]);

    useEffect(() => {
        if (selectedContact) {
            fetchHistory(selectedContact);
            const interval = setInterval(() => fetchHistory(selectedContact), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedContact, fetchHistory]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const isNewContact = selectedContact !== lastContactRef.current;
        
        // Determinar si el usuario está cerca del fondo (margen de 150px)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isNewContact || isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ 
                behavior: isNewContact ? "auto" : "smooth" 
            });
        }
        
        lastContactRef.current = selectedContact;
    }, [messages, selectedContact]);

    const filteredChats = chats.filter(chat =>
        (chat.contact?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (chat.lastMessage?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const handleSelectContact = (contact: string) => {
        setSelectedContact(contact);
        setShowMobileHistory(true);
    };

    const handleBack = () => {
        setShowMobileHistory(false);
        setSelectedContact(null);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedContact) return;
        setSending(true);
        try {
            const res = await fetch(`${apiUrl}/api/whatsapp/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: selectedContact, message: newMessage })
            });
            if (res.ok) {
                setNewMessage("");
                fetchHistory(selectedContact);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const formatMessageTime = (dateStr: string) => {
        const date = parseUTC(dateStr);
        
        // Helper to get time in Cancun
        const getTimeInCancun = (d: Date) => {
            return d.toLocaleTimeString('es-MX', { 
                timeZone: 'America/Cancun',
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false
            });
        };

        const getFullDateInCancun = (d: Date) => {
            return d.toLocaleDateString('es-MX', { 
                timeZone: 'America/Cancun',
                day: '2-digit',
                month: 'short'
            });
        };

        // Check if it's today in Cancun
        const now = new Date();
        const todayCancun = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Cancun', year: 'numeric', month: 'numeric', day: 'numeric' }).format(now);
        const dateCancun = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Cancun', year: 'numeric', month: 'numeric', day: 'numeric' }).format(date);
        
        if (todayCancun === dateCancun) {
            return getTimeInCancun(date);
        }
        
        // Yesterday check
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayCancun = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Cancun', year: 'numeric', month: 'numeric', day: 'numeric' }).format(yesterday);
        
        if (dateCancun === yesterdayCancun) {
            return `Ayer ${getTimeInCancun(date)}`;
        }

        return `${getFullDateInCancun(date)} ${getTimeInCancun(date)}`;
    };

    const getInitials = (name?: string) => {
        if (!name || name === 'Prospecto WhatsApp') return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex-col gap-4 overflow-hidden px-4 md:px-0">
            {/* Header Desktop - Ultra Modern */}
            <div className="hidden md:flex items-center justify-between px-1">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Neural Communications</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-white font-outfit uppercase">
                        Inbox <span className="text-primary">AI</span>
                    </h1>
                </motion.div>
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center gap-4"
                >
                    <div className="flex -space-x-3 mr-4">
                        {[1, 2, 3, 4].map((i) => (
                            <motion.div 
                                key={i} 
                                whileHover={{ y: -5, scale: 1.1 }}
                                className="h-10 w-10 rounded-2xl border-2 border-[#080808] bg-white/5 flex items-center justify-center backdrop-blur-xl group cursor-pointer overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </motion.div>
                        ))}
                        <div className="h-10 w-10 rounded-2xl border-2 border-[#080808] bg-primary/20 flex items-center justify-center backdrop-blur-xl text-[10px] font-black text-primary shadow-lg shadow-primary/20">
                            +12
                        </div>
                    </div>
                    <button
                        onClick={() => { setRefreshing(true); fetchChats(); }}
                        className={cn(
                            "h-12 w-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary shadow-2xl flex items-center justify-center group",
                            refreshing && "animate-spin text-primary"
                        )}
                    >
                        <RefreshCw className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </motion.div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden relative">
                {/* Contact List - Glassmorphism Design */}
                <motion.div 
                    initial={false}
                    animate={{ 
                        width: isMobile && showMobileHistory ? "0%" : (isMobile ? "100%" : "400px"),
                        opacity: isMobile && showMobileHistory ? 0 : 1,
                        x: isMobile && showMobileHistory ? -50 : 0
                    }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className={cn(
                        "flex flex-col w-full md:w-[350px] lg:w-[400px] shrink-0 rounded-[3rem] border border-white/5 bg-[#0a0a0a]/80 backdrop-blur-3xl overflow-hidden transition-all duration-700 md:!opacity-100 md:!translate-x-0 relative",
                        isMobile && showMobileHistory ? "hidden" : "flex shadow-2xl shadow-black/50"
                    )}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none opacity-20" />
                    
                    <div className="p-8 border-b border-white/5 space-y-4 relative z-10">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-[1.7rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                            <div className="relative">
                                <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar conversación..."
                                    className="w-full rounded-[1.5rem] border border-white/10 bg-black/40 py-4 pl-14 pr-6 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all backdrop-blur-2xl placeholder:text-muted-foreground/30 text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        {/* Dropdown de Filtros */}
                        <div className="relative group/filter">
                            <Filter className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within/filter:text-primary transition-colors z-10 pointer-events-none" />
                            <select 
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full appearance-none rounded-[1.2rem] border border-white/10 bg-black/40 py-3 pl-14 pr-10 text-[10px] font-black uppercase tracking-[0.2em] focus:outline-none focus:border-primary/50 transition-all backdrop-blur-2xl text-muted-foreground cursor-pointer"
                            >
                                {['Todos', 'No leídos', 'Prioridad', 'IA'].map((tab) => (
                                    <option key={tab} value={tab} className="bg-[#0a0a0a] text-white py-2">
                                        {tab.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none group-focus-within/filter:rotate-180 transition-transform" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative z-10">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6 text-muted-foreground">
                                <div className="relative">
                                    <div className="h-16 w-16 animate-spin rounded-[2rem] border-2 border-primary/20 border-t-primary" />
                                    <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-[2rem] blur-xl" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-primary/60">Neural Sync...</p>
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-6">
                                <div className="h-24 w-24 rounded-[2.5rem] bg-white/2 border border-white/5 flex items-center justify-center group">
                                    <MessageCircle className="h-12 w-12 text-white/5 group-hover:text-primary/20 transition-colors duration-700" />
                                </div>
                                <div>
                                    <p className="font-black text-white text-base uppercase tracking-widest">Silencio absoluto</p>
                                    <p className="text-xs text-muted-foreground mt-3 font-medium leading-relaxed">Tu flujo de mensajes está listo para recibir nuevas conexiones neuronales.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {filteredChats.map((chat) => (
                                        <motion.button
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            whileHover={{ scale: 1.02, x: 4 }}
                                            whileTap={{ scale: 0.98 }}
                                            key={chat.contact}
                                            onClick={() => handleSelectContact(chat.contact)}
                                            className={cn(
                                                "flex w-full items-center gap-5 p-5 rounded-[2.2rem] text-left transition-all relative group overflow-hidden border",
                                                selectedContact === chat.contact 
                                                    ? "bg-primary border-primary/20 shadow-[0_20px_40px_-15px_rgba(var(--primary),0.3)]" 
                                                    : "bg-white/[0.03] border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className={cn(
                                                    "h-16 w-16 rounded-[1.8rem] flex items-center justify-center border-2 transition-all duration-700 overflow-hidden",
                                                    selectedContact === chat.contact
                                                        ? "bg-white/20 border-white/40 rotate-12 shadow-inner"
                                                        : chat.is_advisor 
                                                            ? "bg-indigo-500/20 border-indigo-500/30 group-hover:border-indigo-500/50"
                                                            : "bg-black/40 border-white/5 group-hover:rotate-12 group-hover:border-primary/30"
                                                )}>
                                                    {chat.avatar ? (
                                                        <Image 
                                                            src={chat.avatar} 
                                                            alt={chat.name || chat.contact}
                                                            width={64}
                                                            height={64}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <span className={cn(
                                                            "font-black text-xl transition-all duration-500",
                                                            selectedContact === chat.contact 
                                                                ? "text-white scale-110" 
                                                                : chat.is_advisor
                                                                    ? "text-indigo-400 group-hover:scale-110"
                                                                    : "text-primary group-hover:scale-110"
                                                        )}>
                                                            {getInitials(chat.name)}
                                                        </span>
                                                    )}
                                                </div>
                                                {chat.is_advisor && (
                                                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border-2 border-[#080808] z-10 shadow-lg shadow-indigo-500/20">
                                                        ASESOR
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-2xl border-4 border-[#080808] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className={cn(
                                                        "font-black text-[15px] truncate pr-2 tracking-tight uppercase",
                                                        selectedContact === chat.contact ? "text-black" : "text-white"
                                                    )}>
                                                        {chat.name || `+${chat.contact}`}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] font-black whitespace-nowrap opacity-80",
                                                        selectedContact === chat.contact ? "text-black/70" : "text-muted-foreground"
                                                    )}>
                                                        {formatMessageTime(chat.timestamp)}
                                                    </span>
                                                </div>
                                                <p className={cn(
                                                    "line-clamp-1 text-xs leading-relaxed font-bold tracking-tight",
                                                    selectedContact === chat.contact ? "text-black/80" : "text-muted-foreground"
                                                )}>
                                                    {chat.lastMessage}
                                                </p>
                                            </div>
                                            {selectedContact === chat.contact && (
                                                <motion.div 
                                                    layoutId="active-pill"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 bg-white rounded-full shadow-[0_0_10px_white]" 
                                                />
                                            )}
                                        </motion.button>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Message History - Dynamic Chat Interface */}
                <motion.div 
                    initial={false}
                    animate={{ 
                        x: isMobile && !showMobileHistory ? "100%" : 0,
                        opacity: isMobile && !showMobileHistory ? 0 : 1
                    }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className={cn(
                        "flex flex-1 flex-col rounded-[3rem] border border-white/5 bg-[#050505]/60 backdrop-blur-3xl overflow-hidden transition-all duration-700 md:!translate-x-0 md:!opacity-100 shadow-2xl relative min-w-0",
                        isMobile && !showMobileHistory ? "hidden" : "flex"
                    )}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent pointer-events-none opacity-20" />
                    
                    {selectedContact ? (
                        <>
                            {/* Chat Header - Ultra Glossy */}
                            <div className="flex items-center justify-between p-8 border-b border-white/5 bg-[#0a0a0a]/40 backdrop-blur-3xl relative z-20">
                                <div className="flex items-center gap-6">
                                    <motion.button
                                        whileHover={{ x: -5 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleBack}
                                        className="md:hidden p-4 rounded-[1.5rem] bg-white/5 border border-white/10 text-white transition-all active:scale-90"
                                    >
                                        <ArrowLeft className="h-6 w-6" />
                                    </motion.button>
                                    <div className="relative">
                                        <div className="h-16 w-16 rounded-[1.8rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-2xl shadow-primary/20 relative z-10 overflow-hidden">
                                            {(() => {
                                                const contactInfo = chats.find(c => c.contact === selectedContact);
                                                return contactInfo?.avatar ? (
                                                    <Image 
                                                        src={contactInfo.avatar}
                                                        alt={selectedContact}
                                                        width={64}
                                                        height={64}
                                                        className="object-cover w-full h-full"
                                                    />
                                                ) : (
                                                    <span className="font-black text-xl text-primary">
                                                        {getInitials(contactInfo?.name)}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <div className="absolute -inset-2 bg-primary/20 rounded-[2rem] blur-xl opacity-50" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-xl text-white tracking-tighter leading-none mb-2 uppercase">
                                            {chats.find(c => c.contact === selectedContact)?.name || `+${selectedContact}`}
                                        </h2>
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">En línea</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all flex items-center justify-center group hidden sm:flex">
                                        <Phone className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <button className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all flex items-center justify-center group">
                                        <MoreVertical className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List - Modern Bubble Design */}
                            <div 
                                ref={scrollContainerRef}
                                className="flex-1 overflow-y-auto p-8 space-y-8 bg-transparent custom-scrollbar relative z-10 no-scrollbar"
                            >
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, i) => {
                                        const isOutbound = msg.direction === 'outbound';
                                        const showTime = i === 0 || 
                                            new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 300000;

                                        return (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 30, scale: 0.9, x: isOutbound ? 20 : -20 }}
                                                animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                                                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                                                key={msg.id} 
                                                className={cn(
                                                    "flex w-full flex-col",
                                                    isOutbound ? "items-end" : "items-start"
                                                )}
                                            >
                                                {showTime && (
                                                    <span className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 w-full text-center">
                                                        {formatMessageTime(msg.createdAt)}
                                                    </span>
                                                )}
                                                <div className={cn(
                                                    "relative max-w-[85%] md:max-w-[70%] px-6 py-4 rounded-[2rem] shadow-2xl transition-all hover:scale-[1.02]",
                                                    isOutbound 
                                                        ? "bg-primary text-black rounded-tr-none font-bold" 
                                                        : "bg-white/5 border border-white/10 text-white rounded-tl-none font-medium backdrop-blur-xl"
                                                )}>
                                                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                                                    <div className={cn(
                                                        "mt-2 flex items-center gap-1.5 opacity-40",
                                                        isOutbound ? "justify-end text-black" : "justify-start text-white"
                                                    )}>
                                                        <span className="text-[9px] font-black uppercase tracking-tighter">
                                                            {format(new Date(msg.createdAt), "HH:mm")}
                                                        </span>
                                                        {isOutbound && <CheckCheck className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} className="h-4" />
                                </AnimatePresence>
                            </div>

                            {/* Message Input - Neural Field */}
                            <div className="p-8 border-t border-white/5 bg-white/[0.01] backdrop-blur-3xl relative z-20">
                                <div className="flex items-center gap-4 bg-black/40 p-3 rounded-[2.2rem] border border-white/10 focus-within:border-primary/50 transition-all shadow-inner relative group">
                                    <div className="absolute -inset-1 bg-primary/5 rounded-[2.3rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                                    <div className="flex items-center gap-1 pl-2">
                                        <button className="p-3 rounded-2xl hover:bg-white/5 text-muted-foreground hover:text-primary transition-all">
                                            <Paperclip className="h-5 w-5" />
                                        </button>
                                        <button className="p-3 rounded-2xl hover:bg-white/5 text-muted-foreground hover:text-primary transition-all hidden sm:flex">
                                            <Smile className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Escribe tu mensaje..."
                                        className="flex-1 bg-transparent py-4 text-sm font-bold focus:outline-none placeholder:text-muted-foreground/30 px-2"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        disabled={sending}
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.05, rotate: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleSendMessage}
                                        disabled={sending || !newMessage.trim()}
                                        className={cn(
                                            "h-14 w-14 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl relative overflow-hidden group/send",
                                            newMessage.trim() 
                                                ? "bg-primary text-white shadow-primary/30" 
                                                : "bg-white/5 text-muted-foreground grayscale cursor-not-allowed"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity" />
                                        {sending ? (
                                            <RefreshCw className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <Send className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", duration: 1.5 }}
                                className="relative"
                            >
                                <div className="h-40 w-40 rounded-[4rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex items-center justify-center mb-8 relative z-10">
                                    <MessageCircle className="h-20 w-20 text-primary/40" />
                                </div>
                                <div className="absolute -inset-10 bg-primary/5 rounded-full blur-[80px] opacity-30" />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Neural Inbox Ready</h3>
                                <p className="text-muted-foreground max-w-sm font-bold text-sm leading-relaxed opacity-60">
                                    Selecciona una neurona del ecosistema para iniciar la transmisión de datos en tiempo real.
                                </p>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

export default function InboxPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <InboxContent />
        </Suspense>
    );
}

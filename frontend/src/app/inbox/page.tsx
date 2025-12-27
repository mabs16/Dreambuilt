"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
    Search,
    Send,
    User,
    MessageCircle,
    RefreshCw,
    Phone,
    Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatContact {
    contact: string;
    name?: string;
    lastMessage: string;
    timestamp: string;
}

interface Message {
    id: number;
    from: string;
    to: string;
    body: string;
    direction: 'inbound' | 'outbound';
    createdAt: string;
}

export default function InboxPage() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [chats, setChats] = useState<ChatContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const chatParam = searchParams.get('chat');
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (chatParam) {
            setSelectedContact(chatParam);
        }
    }, [chatParam]);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${apiUrl}/whatsapp/messages`);
            if (!res.ok) throw new Error("Failed to fetch chats");
            const data = await res.json();
            setChats(data || []);
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchHistory = async (phone: string) => {
        try {
            const res = await fetch(`${apiUrl}/whatsapp/messages/${phone}`);
            if (!res.ok) throw new Error("Failed to fetch history");
            const data = await res.json();
            setMessages(data);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    useEffect(() => {
        fetchChats();
        const interval = setInterval(fetchChats, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedContact) {
            fetchHistory(selectedContact);
            const interval = setInterval(() => fetchHistory(selectedContact), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedContact]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const filteredChats = chats.filter(chat =>
        chat.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRefresh = () => {
        setRefreshing(true);
        // fetchChats(); // Optimistic refresh handled by interval mostly
        if (selectedContact) fetchHistory(selectedContact);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedContact) return;
        setSending(true);
        try {
            const res = await fetch(`${apiUrl}/whatsapp/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: selectedContact, message: newMessage })
            });
            if (res.ok) {
                setNewMessage("");
                // Immediate refresh to show new message
                fetchHistory(selectedContact);
            }
        } catch (e) {
            console.error("Error sending message:", e);
            alert("Error al enviar mensaje");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Message Center</h1>
                    <p className="mt-1 text-muted-foreground italic">Supervisión táctica de conversaciones en tiempo real.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className={cn(
                        "p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground",
                        refreshing && "animate-spin text-primary"
                    )}
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar - Contact List */}
                <div className="flex w-80 flex-col gap-4 rounded-xl border border-border bg-card/50 backdrop-blur-md overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar contacto..."
                                className="w-full rounded-md border border-input bg-background/50 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <RefreshCw className="h-6 w-6 animate-spin" />
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                <MessageCircle className="h-12 w-12 text-muted/20 mb-2" />
                                <p className="text-sm text-muted-foreground">No hay conversaciones registradas.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filteredChats.map((chat) => (
                                    <button
                                        key={chat.contact}
                                        onClick={() => setSelectedContact(chat.contact)}
                                        className={cn(
                                            "flex w-full flex-col gap-1 p-4 text-left transition-colors hover:bg-accent/50",
                                            selectedContact === chat.contact && "bg-accent"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-sm">{chat.name || `+${chat.contact}`}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {format(new Date(chat.timestamp), "HH:mm")}
                                            </span>
                                        </div>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            {chat.lastMessage}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat View */}
                <div className="flex flex-1 flex-col rounded-xl border border-border bg-card/10 backdrop-blur-md overflow-hidden">
                    {!selectedContact ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="rounded-full bg-accent/30 p-4 mb-4">
                                <MessageCircle className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground">Selecciona un chat</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Elige un contacto de la izquierda para ver el historial completo de la conversación.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border bg-card/20">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">
                                            {chats.find(c => c.contact === selectedContact)?.name || `+${selectedContact}`}
                                        </h3>
                                        <div className="flex items-center gap-1 text-[10px] text-status-assigned">
                                            <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                                            CONEXIÓN EN VIVO
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors border border-border">
                                        <Phone className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.map((msg) => {
                                    const isSystem = msg.direction === 'outbound';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex flex-col max-w-[80%] gap-1",
                                                isSystem ? "ml-auto items-end" : "mr-auto items-start"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                    isSystem
                                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                                        : "bg-muted text-foreground rounded-tl-none border border-border"
                                                )}
                                            >
                                                {msg.body}
                                            </div>
                                            <div className="flex items-center gap-1 px-1">
                                                <Clock className="h-3 w-3 text-muted-foreground/50" />
                                                <span className="text-[10px] text-muted-foreground/50 font-mono">
                                                    {format(new Date(msg.createdAt), "HH:mm:ss")}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Functional Input Bar */}
                            <div className="p-4 border-t border-border bg-card/20">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Escribe un mensaje..."
                                        className="flex-1 bg-background/50 border border-input rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        disabled={sending}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={sending || !newMessage.trim()}
                                        className={cn(
                                            "bg-primary text-primary-foreground p-2 rounded-md transition-all hover:bg-primary/90",
                                            (sending || !newMessage.trim()) && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="mt-2 text-[10px] text-center text-muted-foreground italic">
                                    Al enviar un mensaje, el lead pasará automáticamente a estado CONTACTADO.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

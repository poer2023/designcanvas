'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

// Toast types
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // Return a no-op if not in provider (for standalone usage)
        return {
            toasts: [],
            addToast: (message: string, type?: ToastType) => {
                console.log(`[Toast] ${type || 'info'}: ${message}`);
            },
            removeToast: () => { },
        };
    }
    return context;
}

// Simple global toast for components that can't access context
let globalAddToast: ((message: string, type?: ToastType, duration?: number) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info', duration?: number) {
    if (globalAddToast) {
        globalAddToast(message, type, duration);
    } else {
        console.log(`[Toast] ${type}: ${message}`);
    }
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Register global toast function
    useEffect(() => {
        globalAddToast = addToast;
        return () => { globalAddToast = null; };
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => onRemove(toast.id), toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.duration, onRemove]);

    const icons = {
        info: <Info size={18} className="text-blue-500" />,
        success: <CheckCircle size={18} className="text-green-500" />,
        error: <AlertCircle size={18} className="text-red-500" />,
        warning: <AlertCircle size={18} className="text-yellow-500" />,
    };

    const bgColors = {
        info: 'bg-blue-50 border-blue-200',
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200',
    };

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
                animate-slide-in-right min-w-[280px] max-w-[400px]
                ${bgColors[toast.type]}
            `}
        >
            {icons[toast.type]}
            <span className="flex-1 text-sm text-gray-800">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
}

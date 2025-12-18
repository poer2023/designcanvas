'use client';

import { useLanguageStore } from '@/store/languageStore';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const { language, toggleLanguage } = useLanguageStore();

    return (
        <button
            onClick={toggleLanguage}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            title={language === 'en' ? 'Switch to Chinese' : '切换到英语'}
        >
            <div className="flex items-center gap-1">
                <Globe size={18} />
                <span className="text-xs font-medium w-5">
                    {language === 'en' ? 'EN' : '中'}
                </span>
            </div>
        </button>
    );
}

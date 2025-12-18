import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'zh';

interface LanguageState {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
    persist(
        (set, get) => ({
            language: 'en',
            setLanguage: (lang) => set({ language: lang }),
            toggleLanguage: () => set({ language: get().language === 'en' ? 'zh' : 'en' }),
        }),
        {
            name: 'posterlab-language',
        }
    )
);

export default useLanguageStore;

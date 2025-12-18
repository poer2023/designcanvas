import { useLanguageStore, Language } from '@/store/languageStore';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

type TranslationDict = typeof en;

const translations: Record<Language, TranslationDict> = {
    en,
    zh,
};

/**
 * Get a nested translation value by dot-notation key
 * e.g., 'nav.projects' -> translations[lang].nav.projects
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split('.');
    let result: unknown = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = (result as Record<string, unknown>)[key];
        } else {
            return path; // Return the key if translation not found
        }
    }

    return typeof result === 'string' ? result : path;
}

/**
 * Translation hook - returns a function to translate keys
 */
export function useTranslation() {
    const { language } = useLanguageStore();

    const t = (key: string, params?: Record<string, string | number>): string => {
        let text = getNestedValue(translations[language] as unknown as Record<string, unknown>, key);

        // Replace placeholders like {{count}} with actual values
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
            });
        }

        return text;
    };

    return { t, language };
}

/**
 * Get translation directly (for use outside of React components)
 */
export function translate(key: string, lang?: Language): string {
    const language = lang || useLanguageStore.getState().language;
    return getNestedValue(translations[language] as unknown as Record<string, unknown>, key);
}

export type { Language };

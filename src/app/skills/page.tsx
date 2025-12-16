'use client';

import { useState, useEffect } from 'react';
import { Zap, Plus, Copy, ChevronRight, Tag, Search, ExternalLink, Code2 } from 'lucide-react';

interface SkillManifest {
    name: string;
    version: string;
    description: string;
    tags: string[];
    icon: string;
    color: string;
}

export default function SkillsPage() {
    const [skills, setSkills] = useState<SkillManifest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSkill, setSelectedSkill] = useState<SkillManifest | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSkills();
    }, []);

    async function fetchSkills() {
        try {
            const response = await fetch('/api/skills');
            const data = await response.json();
            if (data.success) {
                setSkills(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch skills:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredSkills = skills.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">Skills</h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {skills.length} skill{skills.length !== 1 ? 's' : ''} available
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                        <input
                            type="text"
                            placeholder="Search skills..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="
                w-64 h-9 pl-9 pr-4 rounded-lg
                bg-[var(--bg-input)] border border-[var(--border-subtle)]
                text-sm text-[var(--text-primary)]
                placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[var(--accent-primary)]
                transition-colors
              "
                        />
                    </div>
                    <button className="
            h-9 px-4 rounded-lg
            bg-[var(--accent-primary)] text-white text-sm font-medium
            hover:bg-[var(--accent-hover)]
            flex items-center gap-2
            transition-colors opacity-50 cursor-not-allowed
          " disabled>
                        <Plus size={16} />
                        <span>Create</span>
                    </button>
                </div>
            </div>

            <div className="flex gap-5 min-h-[calc(100vh-200px)]">
                {/* Skills List */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
                        </div>
                    ) : filteredSkills.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-card)]/30">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                                {searchQuery ? 'No matching skills' : 'No skills found'}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                                {searchQuery ? 'Try a different search term' : 'Add skill manifests to the skills/ directory'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredSkills.map((skill) => (
                                <div
                                    key={skill.name}
                                    onClick={() => setSelectedSkill(skill)}
                                    className={`
                    group cursor-pointer rounded-xl p-4
                    bg-[var(--bg-card)] border transition-all duration-200
                    flex items-center gap-4
                    ${selectedSkill?.name === skill.name
                                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-subtle)]'
                                            : 'border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:shadow-md'}
                  `}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                        style={{ backgroundColor: `${skill.color}15` }}
                                    >
                                        {skill.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-semibold truncate" style={{ color: skill.color }}>
                                                {skill.name}
                                            </h3>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)] font-mono">
                                                v{skill.version}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-2">
                                            {skill.description}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            {skill.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                                                    {tag}
                                                </span>
                                            ))}
                                            {skill.tags.length > 3 && (
                                                <span className="text-[10px] text-[var(--text-tertiary)]">
                                                    +{skill.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Skill Detail */}
                {selectedSkill && (
                    <div className="w-[300px] shrink-0">
                        <div className="sticky top-0 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                            {/* Header with color accent */}
                            <div
                                className="p-5 pb-4"
                                style={{ background: `linear-gradient(135deg, ${selectedSkill.color}15 0%, transparent 100%)` }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                                        style={{ backgroundColor: `${selectedSkill.color}20` }}
                                    >
                                        {selectedSkill.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold" style={{ color: selectedSkill.color }}>
                                            {selectedSkill.name}
                                        </h2>
                                        <span className="text-[11px] text-[var(--text-tertiary)] font-mono">v{selectedSkill.version}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    {selectedSkill.description}
                                </p>
                            </div>

                            {/* Tags */}
                            <div className="px-5 py-4 border-t border-[var(--border-subtle)]">
                                <h4 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedSkill.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="text-xs px-2 py-1 rounded-md bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center gap-1"
                                        >
                                            <Tag size={10} />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-[var(--border-subtle)] space-y-2">
                                <button className="
                  w-full h-9 rounded-lg text-sm font-medium
                  bg-[var(--bg-input)] border border-[var(--border-default)]
                  text-[var(--text-primary)]
                  hover:bg-[var(--bg-hover)]
                  flex items-center justify-center gap-2
                  transition-colors
                ">
                                    <Copy size={14} />
                                    Duplicate
                                </button>
                                <button className="
                  w-full h-9 rounded-lg text-sm font-medium
                  text-[var(--text-tertiary)]
                  hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]
                  flex items-center justify-center gap-2
                  transition-colors
                ">
                                    <Code2 size={14} />
                                    View Source
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

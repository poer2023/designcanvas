'use client';

import { useState, useEffect } from 'react';
import { Zap, Plus, Copy, ChevronRight, Tag } from 'lucide-react';

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

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="heading-xl mb-1">Skill Library</h1>
                    <p className="text-secondary">Browse and manage reusable workflow skills</p>
                </div>
                <button className="btn btn-primary h-10 px-4" disabled>
                    <Plus size={18} />
                    <span>Create Skill</span>
                </button>
            </div>

            <div className="flex gap-6">
                {/* Skills List */}
                <div className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-border-default border-t-accent-primary rounded-full animate-spin" />
                        </div>
                    ) : skills.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-subtle rounded-xl bg-card/50">
                            <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center text-tertiary mb-4">
                                <Zap size={32} />
                            </div>
                            <h3 className="heading-md mb-2">No skills found</h3>
                            <p className="text-secondary max-w-sm mb-6">
                                Add skill manifests to the <code className="text-xs bg-bg-hover px-1 py-0.5 rounded">skills/</code> directory.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {skills.map((skill) => (
                                <div
                                    key={skill.name}
                                    onClick={() => setSelectedSkill(skill)}
                                    className={`
                    card cursor-pointer flex items-center gap-4 p-4
                    ${selectedSkill?.name === skill.name ? 'ring-2 ring-accent-primary border-accent-primary' : ''}
                  `}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                        style={{ backgroundColor: `${skill.color}20` }}
                                    >
                                        {skill.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="heading-sm truncate" style={{ color: skill.color }}>
                                                {skill.name}
                                            </h3>
                                            <span className="badge badge-gray">v{skill.version}</span>
                                        </div>
                                        <p className="text-sm text-secondary line-clamp-1">
                                            {skill.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {skill.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-hover text-tertiary">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-tertiary shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Skill Detail */}
                {selectedSkill && (
                    <div className="w-[360px] bg-panel border border-subtle rounded-xl p-6 h-fit sticky top-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                                style={{ backgroundColor: `${selectedSkill.color}20` }}
                            >
                                {selectedSkill.icon}
                            </div>
                            <div>
                                <h2 className="heading-md" style={{ color: selectedSkill.color }}>
                                    {selectedSkill.name}
                                </h2>
                                <span className="text-xs text-tertiary">v{selectedSkill.version}</span>
                            </div>
                        </div>

                        <p className="text-sm text-secondary mb-4">
                            {selectedSkill.description}
                        </p>

                        <div className="mb-4">
                            <h4 className="text-xs font-medium text-tertiary uppercase mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedSkill.tags.map(tag => (
                                    <span
                                        key={tag}
                                        className="text-xs px-2 py-1 rounded-full bg-bg-hover text-secondary flex items-center gap-1"
                                    >
                                        <Tag size={10} />
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-subtle space-y-2">
                            <button className="btn btn-secondary w-full justify-center" disabled>
                                <Copy size={14} />
                                <span>Duplicate to My Skills</span>
                            </button>
                            <button className="btn btn-ghost w-full justify-center text-tertiary" disabled>
                                View Source
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

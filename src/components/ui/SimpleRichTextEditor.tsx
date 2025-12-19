'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
    Bold,
    Italic,
    Heading1,
    List,
    Code,
    Link,
} from 'lucide-react';

/**
 * PRD v2.1: Lightweight rich text editor for TextCard Notes mode
 * 
 * Features:
 * - Bold, Italic, Heading, List, Code, Link
 * - Contenteditable-based (no external dependencies)
 * - Outputs markdown for storage compatibility
 */

interface SimpleRichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

// Convert HTML to Markdown (simplified)
function htmlToMarkdown(html: string): string {
    let md = html;

    // Handle divs and line breaks
    md = md.replace(/<div><br><\/div>/gi, '\n');
    md = md.replace(/<div>/gi, '\n');
    md = md.replace(/<\/div>/gi, '');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Handle formatting
    md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
    md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');

    // Handle headings
    md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n');
    md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n');
    md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n');

    // Handle links
    md = md.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)');

    // Handle lists (use [\s\S] instead of . with 's' flag for multiline matching)
    md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, content) => {
        return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
    });
    md = md.replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, content) => {
        let i = 1;
        return content.replace(/<li>(.*?)<\/li>/gi, () => `${i++}. $1\n`);
    });

    // Clean up any remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = md;
    md = textarea.value;

    // Clean up extra newlines
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();

    return md;
}

// Convert Markdown to HTML (simplified)
function markdownToHtml(md: string): string {
    let html = md;

    // Escape HTML
    html = html.replace(/&/g, '&amp;');
    html = html.replace(/</g, '&lt;');
    html = html.replace(/>/g, '&gt;');

    // Handle headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Handle bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Handle inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Handle unordered lists
    const lines = html.split('\n');
    let inList = false;
    const processedLines: string[] = [];

    for (const line of lines) {
        if (line.match(/^- (.+)$/)) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${line.substring(2)}</li>`);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            processedLines.push(line);
        }
    }
    if (inList) {
        processedLines.push('</ul>');
    }

    html = processedLines.join('\n');

    // Convert newlines to divs (for contenteditable)
    html = html.replace(/\n/g, '<br>');

    return html;
}

const TOOLBAR_BUTTONS = [
    { id: 'bold', icon: Bold, command: 'bold', title: 'Bold (⌘B)' },
    { id: 'italic', icon: Italic, command: 'italic', title: 'Italic (⌘I)' },
    { id: 'heading', icon: Heading1, command: 'formatBlock', arg: 'h2', title: 'Heading' },
    { id: 'list', icon: List, command: 'insertUnorderedList', title: 'List' },
    { id: 'code', icon: Code, command: 'code', title: 'Code' },
    { id: 'link', icon: Link, command: 'createLink', title: 'Link' },
] as const;

export function SimpleRichTextEditor({
    value,
    onChange,
    placeholder = 'Start typing...',
    className = '',
    readOnly = false,
}: SimpleRichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showToolbar, setShowToolbar] = useState(false);
    const isInitializedRef = useRef(false);

    // Initialize content
    useEffect(() => {
        if (editorRef.current && !isInitializedRef.current) {
            editorRef.current.innerHTML = markdownToHtml(value);
            isInitializedRef.current = true;
        }
    }, [value]);

    // Update content when value changes externally
    useEffect(() => {
        if (editorRef.current && isInitializedRef.current) {
            const currentMd = htmlToMarkdown(editorRef.current.innerHTML);
            if (currentMd !== value) {
                const selection = window.getSelection();
                const hadFocus = document.activeElement === editorRef.current;
                editorRef.current.innerHTML = markdownToHtml(value);
                if (hadFocus && selection) {
                    // Try to restore cursor to end
                    const range = document.createRange();
                    range.selectNodeContents(editorRef.current);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    }, [value]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            const md = htmlToMarkdown(editorRef.current.innerHTML);
            onChange(md);
        }
    }, [onChange]);

    const execCommand = useCallback((command: string, value?: string) => {
        if (readOnly) return;

        if (command === 'code') {
            // Wrap selection in code
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const code = document.createElement('code');
                code.appendChild(range.extractContents());
                range.insertNode(code);
            }
        } else if (command === 'createLink') {
            const url = prompt('Enter URL:');
            if (url) {
                document.execCommand('createLink', false, url);
            }
        } else if (command === 'formatBlock') {
            document.execCommand('formatBlock', false, value || 'p');
        } else {
            document.execCommand(command, false, value);
        }

        handleInput();
        editorRef.current?.focus();
    }, [readOnly, handleInput]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const isMeta = e.metaKey || e.ctrlKey;

        if (isMeta && e.key === 'b') {
            e.preventDefault();
            execCommand('bold');
        } else if (isMeta && e.key === 'i') {
            e.preventDefault();
            execCommand('italic');
        }
    }, [execCommand]);

    return (
        <div className={`relative rounded-lg ${className}`}>
            {/* Toolbar */}
            {showToolbar && !readOnly && (
                <div className="absolute -top-10 left-0 flex items-center gap-0.5 p-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    {TOOLBAR_BUTTONS.map((btn) => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => execCommand(btn.command, 'arg' in btn ? btn.arg : undefined)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                            title={btn.title}
                        >
                            <btn.icon size={14} />
                        </button>
                    ))}
                </div>
            )}

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable={!readOnly}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowToolbar(true)}
                onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
                className={`
                    min-h-[60px] outline-none text-gray-800
                    prose prose-sm max-w-none
                    [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2
                    [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1.5
                    [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1
                    [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1
                    [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1
                    [&_code]:px-1 [&_code]:py-0.5 [&_code]:bg-gray-100 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                    [&_a]:text-blue-600 [&_a]:underline
                    ${!value && !editorRef.current?.innerHTML ? 'before:content-[attr(data-placeholder)] before:text-gray-400' : ''}
                `}
                data-placeholder={placeholder}
                suppressContentEditableWarning
            />
        </div>
    );
}

export default SimpleRichTextEditor;

'use client'

import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useMemo } from 'react';

/** 
 * A reusable Code Viewer/Editor component using CodeMirror
 */
export default function CodeView({
    value,
    title,
    isJson = false,
    editable = false,
    onChange,
    disabled = false,
    minHeight = "auto",
    maxHeight = "none"
}: {
    value: string,
    title?: string,
    isJson?: boolean,
    editable?: boolean,
    onChange?: (v: string) => void,
    disabled?: boolean,
    minHeight?: string,
    maxHeight?: string
}) {
    const extensions = useMemo(() => {
        const ext = [oneDark, EditorView.lineWrapping];
        if (isJson) ext.push(json());
        return ext;
    }, [isJson]);

    return (
        <div className={`group flex flex-col rounded-xl border border-slate-800 bg-[#282c34] overflow-hidden ${disabled ? 'opacity-50' : ''}`} style={{ minHeight, maxHeight }}>
            {title && (
                <div className="shrink-0 px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-slate-500">
                    <span>{title}</span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{isJson ? 'JSON' : 'TEXT'}</span>
                </div>
            )}

            <div className="flex-1 overflow-auto relative min-h-0">
                <CodeMirror
                    value={value}
                    height="100%"
                    theme={oneDark}
                    extensions={extensions}
                    onChange={(val) => onChange?.(val)}
                    editable={editable && !disabled}
                    readOnly={!editable || disabled}
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        dropCursor: true,
                        allowMultipleSelections: true,
                        indentOnInput: true,
                    }}
                    className="codemirror-custom-wrapper h-full flex flex-col min-h-0"
                />
            </div>


            <div className="shrink-0 px-4 py-2 bg-slate-900 border-t border-white/10 text-[10px] text-slate-500 flex justify-between z-10">
                <span>{value.split('\n').length} lines</span>
                <span>Line wrapping enabled</span>
            </div>

            <style jsx global>{`
                .codemirror-custom-wrapper {
                    height: 100% !important;
                }
                .codemirror-custom-wrapper .cm-editor,
                .codemirror-custom-wrapper .cm-theme-one-dark {
                    height: 100% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    min-height: 0 !important;
                    flex: 1 !important;
                }
                .codemirror-custom-wrapper .cm-editor {
                    background-color: transparent !important;
                }
                .codemirror-custom-wrapper .cm-scroller {
                    overflow: auto !important;
                    flex: 1 !important;
                }
                .codemirror-custom-wrapper .cm-gutters {
                    background-color: #1e2227 !important;
                    border-right: 1px solid rgba(255,255,255,0.05) !important;
                    color: #5c6370 !important;
                }
                .codemirror-custom-wrapper .cm-activeLineGutter {
                    background-color: #2c313a !important;
                    color: #abb2bf !important;
                }
                .codemirror-custom-wrapper .cm-content {
                    padding: 1rem 0 2.5rem 0 !important;
                }
                .codemirror-custom-wrapper .cm-line {
                    padding: 0 1rem !important;
                    color: #10b981 !important; /* Emerald-400 to match app */
                }
                /* Re-enable syntax highlighting colors for JSON by targetting specific classes if needed, 
                   but OneDark should handle it. Let's make sure the plain text is emerald though. */
            `}</style>
        </div>
    );
}

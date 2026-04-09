"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import 'react-quill-new/dist/quill.snow.css';

// Reusing the same wrapper used in RichEditor
const QuillWrapper = dynamic(() => import('./QuillWrapper'), { 
  ssr: false,
  loading: () => <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading Editor...</div>
});

interface BioEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowImages?: boolean;
  allowLinks?: boolean;
}

export function BioEditor({ value, onChange, placeholder, className = "", allowImages = true, allowLinks = true }: BioEditorProps) {
  const modules = useMemo(() => {
    const toolbar = [
      [{ 'header': [2, 3, 4, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ];

    const attachments = [];
    if (allowLinks) attachments.push('link');
    if (allowImages) attachments.push('image');

    if (attachments.length > 0) {
      toolbar.push(attachments as any);
    }
    
    toolbar.push(['clean']);

    return { toolbar };
  }, [allowImages, allowLinks]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="bio-editor-wrapper bg-white border border-[#e5e7eb] rounded-xl overflow-hidden transition-all focus-within:border-[#2FA4A9] focus-within:shadow-[0_0_15px_rgba(47,164,169,0.1)]">
        <QuillWrapper 
          theme="snow" 
          value={value} 
          onChange={onChange} 
          modules={modules}
          placeholder={placeholder}
        />
        
        {/* Scoped Light Theme for Profile Settings */}
        <style jsx global>{`
          .bio-editor-wrapper .ql-toolbar {
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
            background-color: #F9FAFB !important;
            padding: 12px !important;
            border-radius: 12px 12px 0 0 !important;
          }
          .bio-editor-wrapper .ql-container {
            border: none !important;
            min-height: 200px;
            font-family: inherit !important;
            font-size: 15px !important;
          }
          .bio-editor-wrapper .ql-editor {
            min-height: 200px;
            color: #374151 !important; /* text-gray-700 */
            padding: 16px !important;
            line-height: 1.6;
          }
          .bio-editor-wrapper .ql-editor.ql-blank::before {
            color: #9CA3AF !important; /* text-gray-400 */
            font-style: normal !important;
          }
          .bio-editor-wrapper .ql-stroke {
            stroke: #6B7280 !important; /* text-gray-500 */
          }
          .bio-editor-wrapper .ql-fill {
            fill: #6B7280 !important;
          }
          .bio-editor-wrapper .ql-picker {
            color: #6B7280 !important;
          }
          .bio-editor-wrapper .ql-active .ql-stroke,
          .bio-editor-wrapper button:hover .ql-stroke {
            stroke: #2FA4A9 !important;
          }
          .bio-editor-wrapper .ql-active .ql-fill,
          .bio-editor-wrapper button:hover .ql-fill {
            fill: #2FA4A9 !important;
          }
          .bio-editor-wrapper .ql-active .ql-picker-label {
            color: #2FA4A9 !important;
          }
          .bio-editor-wrapper .ql-editor a {
            color: #2FA4A9 !important;
            text-decoration: underline !important;
          }
        `}</style>
      </div>
    </div>
  );
}

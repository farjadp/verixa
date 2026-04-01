"use client";

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import { generateAiEmail } from '@/actions/ai.actions';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';

const QuillWrapper = dynamic(() => import('./QuillWrapper'), { 
  ssr: false,
  loading: () => <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">Loading Editor...</div>
});

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, className = "" }: RichEditorProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModel, setAiModel] = useState("gpt-5.4");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showAi, setShowAi] = useState(false);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    setAiError("");

    const response = await generateAiEmail(aiPrompt, aiModel);
    
    setIsGenerating(false);

    if (response.success && response.data) {
      // Append the AI generated content or replace it entirely? 
      // Replace it entirely if it's currently empty, otherwise append
      const newBody = value.trim() ? value + "<br/>" + response.data : response.data;
      onChange(newBody);
      setAiPrompt("");
      setShowAi(false); // Hide the prompt bar after success
    } else {
      setAiError(response.error || "Failed to generate AI content.");
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* AI Assistant Toggle Button */}
      <div className="flex justify-between items-end mb-1">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {showAi ? "Verixa AI Assistant" : ""}
        </label>
        <button 
          type="button"
          onClick={() => setShowAi(!showAi)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            showAi 
              ? "bg-[#2FA4A9] text-white shadow-[0_0_15px_rgba(47,164,169,0.4)]" 
              : "bg-white/5 text-[#2FA4A9] hover:bg-[#2FA4A9]/20 border border-[#2FA4A9]/30"
          }`}
        >
           <Sparkles className="w-3.5 h-3.5" /> {showAi ? "Close AI Tab" : "Use AI Drafter"}
        </button>
      </div>

      {/* AI Prompt Input Bar */}
      {showAi && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 ml-1">AI Model:</label>
            <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="bg-[#111827] border border-[#2FA4A9]/30 rounded-lg px-3 py-1.5 text-white flex-1 text-xs font-medium focus:outline-none focus:border-[#2FA4A9] transition-all"
                title="Select AI Model"
            >
               <option value="gpt-5.4">gpt-5.4 (General Purpose)</option>
               <option value="gpt-5.4-pro">gpt-5.4-pro (Deep Reasoning)</option>
               <option value="gpt-5.4-mini">gpt-5.4-mini (High-volume & Fast)</option>
               <option value="gpt-5.4-nano">gpt-5.4-nano (Cost Efficient Speed)</option>
            </select>
          </div>
          <div className="relative">
            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2FA4A9]" />
            <input 
               type="text" 
               value={aiPrompt}
               onChange={e => setAiPrompt(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerateAi();
                 }
               }}
               placeholder="Tell the AI what you want to say in English or Persian... (Press Enter to draft)"
               className="w-full bg-gradient-to-r from-black/60 to-black/40 border border-[#2FA4A9]/40 pl-10 pr-24 py-3 rounded-xl text-white font-medium focus:outline-none focus:border-[#2FA4A9] focus:shadow-[0_0_20px_rgba(47,164,169,0.2)] transition-all"
               disabled={isGenerating}
            />
            <button 
              type="button"
              onClick={handleGenerateAi}
              disabled={isGenerating || !aiPrompt.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#2FA4A9] text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-[#1a8589] transition-all flex items-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Draft It"}
            </button>
          </div>
          {aiError && <span className="text-red-400 text-xs font-medium pl-1">{aiError}</span>}
        </div>
      )}

      {/* Main Rich Text Editor Wrapper */}
      <div className="rich-editor-wrapper bg-black/30 border border-gray-700 rounded-lg overflow-hidden transition-all focus-within:border-[#2FA4A9] focus-within:shadow-[0_0_15px_rgba(47,164,169,0.1)]">
        <QuillWrapper 
          theme="snow" 
          value={value} 
          onChange={onChange} 
          modules={modules}
          placeholder={placeholder}
        />
        
        {/* Scope styles specifically to match your dark dashboard layout */}
        <style jsx global>{`
          /* MEGA EDITOR: Expand scrolling container toolbar */
          .rich-editor-wrapper .ql-toolbar {
            border: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background-color: rgba(0, 0, 0, 0.2);
            padding: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 2px;
          }
          .rich-editor-wrapper .ql-container {
            border: none;
            min-height: 250px;
            font-family: inherit;
          }
          .rich-editor-wrapper .ql-editor {
            min-height: 250px;
            font-size: 14px;
            color: white;
            padding: 20px;
          }
          .rich-editor-wrapper .ql-editor.ql-blank::before {
            color: #6B7280; /* Tailwind gray-500 */
            font-style: normal;
          }
          /* Icon Colors */
          .rich-editor-wrapper .ql-stroke {
            stroke: #D1D5DB !important; /* gray-300 */
          }
          .rich-editor-wrapper .ql-fill {
            fill: #D1D5DB !important;
          }
          .rich-editor-wrapper .ql-picker {
            color: #D1D5DB;
          }
          .rich-editor-wrapper .ql-picker-options {
            background-color: #111827 !important; /* gray-900 */
            border: 1px solid #374151 !important;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            border-radius: 6px;
          }
          .rich-editor-wrapper .ql-picker-item:hover,
          .rich-editor-wrapper .ql-active .ql-picker-label[data-value],
          .rich-editor-wrapper .ql-picker-label:hover {
            color: #2FA4A9 !important;
          }
          /* Hover and Active Colors (Verixa Teal) */
          .rich-editor-wrapper button:hover .ql-stroke,
          .rich-editor-wrapper .ql-active .ql-stroke {
            stroke: #2FA4A9 !important;
          }
          .rich-editor-wrapper button:hover .ql-fill,
          .rich-editor-wrapper .ql-active .ql-fill {
            fill: #2FA4A9 !important;
          }
          .rich-editor-wrapper .ql-active {
            color: #2FA4A9 !important;
          }
          .rich-editor-wrapper .ql-editor a {
            color: #2FA4A9;
            text-decoration: underline;
          }
          /* Scrollbars inside editor */
          .rich-editor-wrapper .ql-editor::-webkit-scrollbar {
             width: 8px;
          }
          .rich-editor-wrapper .ql-editor::-webkit-scrollbar-thumb {
             background-color: rgba(47,164,169,0.3);
             border-radius: 4px;
          }
        `}</style>
      </div>
    </div>
  );
}

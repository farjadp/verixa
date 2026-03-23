"use client";

import { useRef } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  tablePlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  codeBlockPlugin,
  codeMirrorPlugin,
  InsertCodeBlock,
  directivesPlugin,
  AdmonitionDirectiveDescriptor,
  InsertAdmonition,
  InsertThematicBreak,
  ListsToggle,
  MDXEditorMethods
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

// 1. Link the local Next.js Server Action
import { uploadImageAction } from "@/actions/upload.actions";

interface EditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
}

export default function MDXEditorComponent({ markdown, onChange }: EditorProps) {
  const ref = useRef<MDXEditorMethods>(null);

  // 2. Extractor hook sending dragged image drops into the Node FileSystem
  const imageUploadHandler = async (image: File) => {
    const formData = new FormData();
    formData.append("image", image);
    try {
      const url = await uploadImageAction(formData);
      return url;
    } catch (e) {
      console.error("Upload failed", e);
      throw new Error("Upload Failed");
    }
  };

  return (
    <div className="mdx-editor-wrapper bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm prose-p:my-1 prose-h1:text-gray-900 typography-glass flex flex-col h-[700px]">
      <MDXEditor
        ref={ref}
        markdown={markdown}
        onChange={onChange}
        className="flex-1 overflow-y-auto"
        contentEditableClassName="outline-none p-8 prose prose-lg max-w-none prose-h2:text-[#C29967] prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-md"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          tablePlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin({ imageUploadHandler }),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
          codeMirrorPlugin({ codeBlockLanguages: { js: 'JavaScript', css: 'CSS', txt: 'Text' } }),
          directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
          diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: markdown }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <div className="flex flex-wrap items-center gap-1.5 p-3 bg-gradient-to-b from-[#FAFAFA] to-white border-b border-[#f5ecd8] sticky top-0 z-50 w-full shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <UndoRedo />
                  <div className="w-[1px] h-6 bg-gray-200 mx-2" />
                  
                  <BlockTypeSelect />
                  <div className="w-[1px] h-6 bg-gray-200 mx-2" />
                  
                  <BoldItalicUnderlineToggles />
                  <div className="w-[1px] h-6 bg-gray-200 mx-2" />
                  
                  <ListsToggle />
                  <div className="w-[1px] h-6 bg-gray-200 mx-2" />
                  
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                  <InsertCodeBlock />
                  <InsertAdmonition />
                </div>
              </DiffSourceToggleWrapper>
            )
          })
        ]}
      />
      <style jsx global>{`
        /* Overriding MDXEditor UI styles to match Premium Bento */
        .mdxeditor-toolbar button {
           color: #4b5563 !important;
           border-radius: 6px !important;
           padding: 6px !important;
        }
        .mdxeditor-toolbar button:hover {
           background-color: #f3f4f6 !important;
           color: #111827 !important;
        }
        .mdxeditor-toolbar {
           background-color: transparent !important;
           padding: 0 !important;
           border: none !important;
        }
        .mdxeditor-toolbar [data-state="on"] {
           background-color: #f3f4f6 !important;
           color: #C29967 !important;
        }
      `}</style>
    </div>
  );
}

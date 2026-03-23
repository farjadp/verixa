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
    <div className="mdx-editor-wrapper bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm prose-p:my-1 prose-h1:text-gray-900 typography-glass">
      <MDXEditor
        ref={ref}
        markdown={markdown}
        onChange={onChange}
        contentEditableClassName="min-h-[500px] outline-none p-6 prose prose-lg max-w-none prose-h2:text-[#C29967]"
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
          toolbarPlugin({
            toolbarContents: () => (
              <div className="flex flex-wrap items-center gap-2 p-2 bg-[#FDFCFB] border-b border-[#f5ecd8] sticky top-0 z-10 w-full overflow-x-auto">
                <UndoRedo />
                <div className="w-[1px] h-6 bg-gray-300 mx-1" />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles />
                <div className="w-[1px] h-6 bg-gray-300 mx-1" />
                <CreateLink />
                <InsertImage />
                <InsertTable />
              </div>
            )
          })
        ]}
      />
      <style jsx global>{`
        /* Overriding MDXEditor UI styles to match Premium Bento */
        .mdxeditor-toolbar button {
           color: #4b5563 !important;
        }
        .mdxeditor-toolbar button:hover {
           background-color: #f3f4f6 !important;
        }
        .mdxeditor-toolbar {
           background-color: #FAFAFA !important;
        }
      `}</style>
    </div>
  );
}

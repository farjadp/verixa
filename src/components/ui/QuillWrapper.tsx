"use client";

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function QuillWrapper(props: any) {
  return <ReactQuill {...props} />;
}

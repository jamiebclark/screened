"use client";

import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  autoFocus?: boolean;
  maxLength?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  height = 180,
  autoFocus,
  maxLength,
  onKeyDown,
  disabled,
}: MarkdownEditorProps) {
  return (
    <div
      data-color-mode="dark"
      className="rounded-md overflow-hidden border border-border"
    >
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? "")}
        height={height}
        preview="edit"
        textareaProps={{
          placeholder,
          autoFocus,
          maxLength,
          onKeyDown,
          disabled,
        }}
      />
    </div>
  );
}

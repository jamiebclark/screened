"use client";

import dynamic from "next/dynamic";
import { useIsSmUp } from "@/hooks/use-media-query";

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
  /**
   * "live" shows the editor and preview side by side. That only applies from
   * `sm` up; phones always get the editor alone, since a split leaves each
   * pane a few words wide.
   */
  preview?: "edit" | "live";
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
  preview = "edit",
}: MarkdownEditorProps) {
  const isSmUp = useIsSmUp();
  return (
    <div
      data-color-mode="dark"
      className="rounded-md overflow-hidden border border-border"
    >
      <MDEditor
        value={value}
        onChange={(val) => onChange(val ?? "")}
        height={height}
        preview={preview === "live" && isSmUp ? "live" : "edit"}
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

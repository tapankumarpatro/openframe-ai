"use client";

import { memo, useState, useRef, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
import { StickyNote, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type NoteNodeData = {
  noteId: string;
  content: string;
  onUpdate?: (noteId: string, content: string) => void;
  onDelete?: (noteId: string) => void;
};

function NoteNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as NoteNodeData;
  const [editing, setEditing] = useState(!d.content);
  const [content, setContent] = useState(d.content || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (d.onUpdate) d.onUpdate(d.noteId, content);
  };

  // Simple markdown rendering (bold, italic, headers, lists)
  const renderMarkdown = (text: string) => {
    if (!text) return <span className="text-muted italic text-[10px]">Click to edit note...</span>;
    return text.split("\n").map((line, i) => {
      let el: React.ReactNode = line;
      // Headers
      if (line.startsWith("### ")) el = <strong className="text-[11px] text-accent-primary">{line.slice(4)}</strong>;
      else if (line.startsWith("## ")) el = <strong className="text-xs text-accent-magenta">{line.slice(3)}</strong>;
      else if (line.startsWith("# ")) el = <strong className="text-sm text-foreground">{line.slice(2)}</strong>;
      // List items
      else if (line.startsWith("- ")) el = <span>&bull; {line.slice(2)}</span>;
      // Bold and italic inline
      else {
        let processed = line;
        processed = processed.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
        processed = processed.replace(/\*(.+?)\*/g, "<i>$1</i>");
        el = <span dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      return <div key={i} className="leading-relaxed">{el}</div>;
    });
  };

  return (
    <div
      className={cn(
        "bg-card/90 backdrop-blur-sm rounded-xl border-2 shadow-lg transition-colors w-[280px]",
        selected ? "border-accent-yellow/60 shadow-accent-yellow/10" : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <GripVertical className="w-3 h-3 text-muted cursor-grab" />
        <StickyNote className="w-3.5 h-3.5 text-accent-yellow" />
        <span className="text-[10px] font-semibold text-foreground flex-1">Note</span>
        {d.onDelete && (
          <button
            onClick={() => d.onDelete!(d.noteId)}
            className="p-1 rounded hover:bg-accent-red/20 text-muted hover:text-accent-red transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2 min-h-[60px]">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="nodrag nowheel w-full text-[11px] text-foreground leading-relaxed bg-transparent border-none outline-none resize-y min-h-[80px] max-h-[400px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            placeholder="Write markdown notes here...&#10;# Heading&#10;- List item&#10;**bold** *italic*"
            rows={6}
          />
        ) : (
          <div
            className="text-[11px] text-foreground/80 cursor-pointer min-h-[40px]"
            onClick={() => setEditing(true)}
          >
            {renderMarkdown(content)}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(NoteNodeComponent);

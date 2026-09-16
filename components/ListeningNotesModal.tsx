'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Printer, Edit3, Save, Sparkles, RefreshCw } from 'lucide-react';

interface ListeningNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instructorName: string;
  date: string;
  notesContent: string;
  canEdit?: boolean;
  activityId?: number;
  onSave?: (newContent: string) => Promise<void>;
  onRegenerate?: () => Promise<string | null>;
}

function ListeningNotesBody({
  title,
  instructorName,
  date,
  initialContent,
  canEdit,
  onSave,
  onRegenerate,
  onClose,
}: {
  title: string;
  instructorName: string;
  date: string;
  initialContent: string;
  canEdit: boolean;
  onSave?: (newContent: string) => Promise<void>;
  onRegenerate?: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>听课记录表 - ${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; padding: 40px; line-height: 1.8; color: #1f2937; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 22px; }
          .meta { text-align: center; color: #4b5563; font-size: 14px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
          pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>颍上县耿棚中学教师公开课听课记录表</h1>
        <div class="meta">授课人：${instructorName} &nbsp;|&nbsp; 课题：${title} &nbsp;|&nbsp; 日期：${date}</div>
        <pre>${content}</pre>
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(content);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAiRegenerate = async () => {
    if (!onRegenerate) return;
    setGenerating(true);
    try {
      const newText = await onRegenerate();
      if (newText) {
        setContent(newText);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>听课记录文字版样例</span>
            <span className="px-2 py-0.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI生成
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            课题：{title} &nbsp;|&nbsp; 授课人：{instructorName} &nbsp;|&nbsp; 日期：{date}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && onRegenerate && (
            <button
              id="ai-regenerate-notes-btn"
              onClick={handleAiRegenerate}
              disabled={generating}
              className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'AI撰写中...' : '重新生成'}
            </button>
          )}
          {canEdit && (
            <button
              id="edit-listening-notes-btn"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#5b52a3]" />
              {isEditing ? '预览模式' : '编辑记录'}
            </button>
          )}
          <button
            id="copy-listening-notes-btn"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            {copied ? '已复制' : '复制文本'}
          </button>
          <button
            id="print-listening-notes-btn"
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            打印
          </button>
          <button
            id="close-listening-notes-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-200 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1 text-gray-800 text-sm leading-relaxed space-y-4 font-sans">
        {isEditing ? (
          <textarea
            id="listening-notes-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[55vh] p-4 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
          />
        ) : (
          <div className="whitespace-pre-wrap bg-white p-5 rounded-lg border border-gray-100 text-gray-800 leading-relaxed font-sans">
            {content || '暂无听课记录样例，点击“重新生成”即可由大模型自动撰写。'}
          </div>
        )}
      </div>

      {/* Footer */}
      {isEditing && (
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      )}
    </>
  );
}

export default function ListeningNotesModal({
  isOpen,
  onClose,
  title,
  instructorName,
  date,
  notesContent,
  canEdit = false,
  activityId,
  onSave,
  onRegenerate,
}: ListeningNotesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <ListeningNotesBody
          key={activityId ? `act-${activityId}` : notesContent.slice(0, 30)}
          title={title}
          instructorName={instructorName}
          date={date}
          initialContent={notesContent}
          canEdit={canEdit}
          onSave={onSave}
          onRegenerate={onRegenerate}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

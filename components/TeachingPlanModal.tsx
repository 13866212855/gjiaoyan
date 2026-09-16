'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Printer, Edit3, Save } from 'lucide-react';

interface TeachingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instructorName: string;
  date: string;
  planContent: string;
  canEdit?: boolean;
  activityId?: number;
  onSave?: (newContent: string) => Promise<void>;
}

function TeachingPlanBody({
  title,
  instructorName,
  date,
  initialContent,
  canEdit,
  onSave,
  onClose,
}: {
  title: string;
  instructorName: string;
  date: string;
  initialContent: string;
  canEdit: boolean;
  onSave?: (newContent: string) => Promise<void>;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

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
        <title>${title} - 电子教案</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; padding: 40px; line-height: 1.8; color: #1f2937; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 24px; }
          .meta { text-align: center; color: #4b5563; font-size: 14px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
          pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>${title} - 教学设计教案</h1>
        <div class="meta">学校：颍上县耿棚中学 &nbsp;|&nbsp; 授课人：${instructorName} &nbsp;|&nbsp; 日期：${date}</div>
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>电子教案：{title}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            授课人：{instructorName} &nbsp;|&nbsp; 日期：{date} &nbsp;|&nbsp; 颍上县耿棚中学信息技术教研组
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              id="edit-teaching-plan-btn"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#5b52a3]" />
              {isEditing ? '预览模式' : '编辑教案'}
            </button>
          )}
          <button
            id="copy-teaching-plan-btn"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            {copied ? '已复制' : '复制文本'}
          </button>
          <button
            id="print-teaching-plan-btn"
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            打印教案
          </button>
          <button
            id="close-teaching-plan-modal-btn"
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
            id="teaching-plan-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[55vh] p-4 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
          />
        ) : (
          <div className="whitespace-pre-wrap bg-white p-5 rounded-lg border border-gray-100 text-gray-800 leading-relaxed font-sans">
            {content || '暂无教案详情内容'}
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
            {saving ? '保存中...' : '保存更改'}
          </button>
        </div>
      )}
    </>
  );
}

export default function TeachingPlanModal({
  isOpen,
  onClose,
  title,
  instructorName,
  date,
  planContent,
  canEdit = false,
  activityId,
  onSave,
}: TeachingPlanModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        <TeachingPlanBody
          key={activityId ? `act-${activityId}` : planContent.slice(0, 30)}
          title={title}
          instructorName={instructorName}
          date={date}
          initialContent={planContent}
          canEdit={canEdit}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

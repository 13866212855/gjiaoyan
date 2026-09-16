'use client';

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHideBeforeDate: string | null;
  onSave: (date: string | null) => Promise<void>;
}

function DisplaySettingsForm({
  currentHideBeforeDate,
  onSave,
  onClose,
}: {
  currentHideBeforeDate: string | null;
  onSave: (date: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [dateValue, setDateValue] = useState(currentHideBeforeDate || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!dateValue) {
      setError('请选择要隐藏的日期节点');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(dateValue);
      onClose();
    } catch {
      setError('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave(null);
      setDateValue('');
      onClose();
    } catch {
      setError('清除隐藏设置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-lg border border-gray-100">
        设置日期后，<span className="font-semibold text-gray-800">活动日期早于该日期</span>
        的教研活动在前台展示页和本后台的活动列表中都将不再显示（记录不会被删除，可在活动列表中临时显示旧记录，或随时在此恢复显示全部）。
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          隐藏此日期之前的活动记录
        </label>
        <div className="relative">
          <input
            id="hide-before-date-input"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        {currentHideBeforeDate ? (
          <span>
            当前已设置隐藏：早于{' '}
            <strong className="text-[#5b52a3]">{currentHideBeforeDate}</strong> 的历史活动
          </span>
        ) : (
          <span>当前未设置隐藏，前台和后台均显示全部活动记录</span>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          id="save-display-settings-btn"
          onClick={handleSave}
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg transition-colors disabled:opacity-50"
        >
          保存设置
        </button>
        <button
          id="clear-display-settings-btn"
          onClick={handleClear}
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#55697a] hover:bg-[#435361] rounded-lg transition-colors disabled:opacity-50"
        >
          清除隐藏（显示全部）
        </button>
      </div>

      <p className="text-xs text-gray-400">
        提示：清除隐藏后，前台的“临时显示旧记录”偏好也会一并重置。
      </p>
    </div>
  );
}

export default function DisplaySettingsModal({
  isOpen,
  onClose,
  currentHideBeforeDate,
  onSave,
}: DisplaySettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">前台显示设置</h2>
          <button
            id="close-display-settings-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DisplaySettingsForm
          key={currentHideBeforeDate || 'empty'}
          currentHideBeforeDate={currentHideBeforeDate}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

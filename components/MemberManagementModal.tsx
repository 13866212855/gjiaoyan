'use client';

import React, { useState } from 'react';
import { X, UserPlus, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import { Member } from '@/lib/db';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onRefresh: () => Promise<void>;
}

export default function MemberManagementModal({
  isOpen,
  onClose,
  members,
  onRefresh,
}: MemberManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renamingVal, setRenamingVal] = useState('');
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [replacingVal, setReplacingVal] = useState('');

  if (!isOpen) return null;

  const activeMembers = members.filter((m) => m.status === 'active');
  const inactiveMembers = members.filter((m) => m.status === 'inactive');

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewName('');
        await onRefresh();
      } else {
        setError(data.message || '添加失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id: number) => {
    if (!renamingVal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', id, name: renamingVal.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRenamingId(null);
        setRenamingVal('');
        await onRefresh();
      } else {
        setError(data.message || '改名失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async (id: number) => {
    if (!replacingVal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'replace', id, newName: replacingVal.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setReplacingId(null);
        setReplacingVal('');
        await onRefresh();
      } else {
        setError(data.message || '更换失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRetire = async (id: number, name: string) => {
    if (!confirm(`确定将成员“${name}”标记为退出吗？历史听课记录仍将保留。`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retire', id }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefresh();
      } else {
        setError(data.message || '标记退出失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', id }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefresh();
      } else {
        setError(data.message || '恢复失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">成员管理</h2>
          <button
            id="close-member-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Note text */}
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-lg border border-gray-100">
            更换成员（如&ldquo;陈家发&rdquo;更换为&ldquo;刘俊杰&rdquo;）时，旧成员标记为退出但保留全部历史记录，新成员仅参与新活动。退出成员的历史听课记录在前台仍正常显示。
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Members Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-blue-600 flex items-center gap-1.5">
                当前成员
                <span className="text-xs font-normal text-gray-500">({activeMembers.length}人)</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  id={`member-row-${member.id}`}
                  className="flex flex-wrap items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 text-base min-w-[4rem]">{member.name}</span>
                    <span className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded">
                      在职
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {renamingId === member.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={renamingVal}
                          onChange={(e) => setRenamingVal(e.target.value)}
                          className="px-2 py-1 text-sm border rounded w-28 focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                          placeholder="新名字"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(member.id)}
                          disabled={loading}
                          className="px-2.5 py-1 text-xs text-white bg-[#5b52a3] rounded hover:bg-[#4d4491]"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => {
                            setRenamingId(null);
                            setRenamingVal('');
                          }}
                          className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          取消
                        </button>
                      </div>
                    ) : replacingId === member.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={replacingVal}
                          onChange={(e) => setReplacingVal(e.target.value)}
                          className="px-2 py-1 text-sm border rounded w-32 focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                          placeholder="替换为新人姓名"
                          autoFocus
                        />
                        <button
                          onClick={() => handleReplace(member.id)}
                          disabled={loading}
                          className="px-2.5 py-1 text-xs text-white bg-[#5b52a3] rounded hover:bg-[#4d4491]"
                        >
                          确认替换
                        </button>
                        <button
                          onClick={() => {
                            setReplacingId(null);
                            setReplacingVal('');
                          }}
                          className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          id={`rename-member-btn-${member.id}`}
                          onClick={() => {
                            setRenamingId(member.id);
                            setRenamingVal(member.name);
                            setReplacingId(null);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#55697a] hover:bg-[#435361] rounded transition-colors"
                        >
                          改名
                        </button>
                        <button
                          id={`replace-member-btn-${member.id}`}
                          onClick={() => {
                            setReplacingId(member.id);
                            setReplacingVal('');
                            setRenamingId(null);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#55697a] hover:bg-[#435361] rounded transition-colors"
                        >
                          更换为新人
                        </button>
                        <button
                          id={`retire-member-btn-${member.id}`}
                          onClick={() => handleRetire(member.id, member.name)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#c93b3b] hover:bg-[#b02f2f] rounded transition-colors"
                        >
                          标记退出
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Member Form */}
          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">添加新教研组成员</h4>
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                id="new-member-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="输入新成员姓名（如：张华）"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
              />
              <button
                id="submit-add-member-btn"
                type="submit"
                disabled={loading || !newName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                添加
              </button>
            </form>
          </div>

          {/* Inactive Members Section */}
          {inactiveMembers.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center justify-between">
                <span>已退出/历史成员 ({inactiveMembers.length}人)</span>
              </h4>
              <div className="space-y-2">
                {inactiveMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium">{member.name}</span>
                      <span className="px-2 py-0.5 text-xs text-gray-500 bg-gray-200 rounded">
                        已退出
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestore(member.id)}
                      className="px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      恢复在职
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

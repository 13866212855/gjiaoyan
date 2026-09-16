'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Zap, AlertCircle } from 'lucide-react';
import { LlmConfig } from '@/lib/db';

interface LlmConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LlmConfigModal({ isOpen, onClose }: LlmConfigModalProps) {
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Form states matching Image 5
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('deepseek-chat');

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/llm');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || []);
      }
    } catch {
      setError('无法获取大模型配置列表');
    }
  };

  useEffect(() => {
    let ignore = false;
    if (!isOpen) return;

    fetch('/api/llm')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setConfigs(data.configs || []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('无法获取大模型配置列表');
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !apiKey.trim() || !modelName.trim()) {
      setError('请完整填写所有配置项');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          base_url: baseUrl.trim(),
          api_key: apiKey.trim(),
          model_name: modelName.trim(),
          is_active: configs.length === 0 ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setApiKey('');
        await fetchConfigs();
      } else {
        setError(data.message || '添加配置失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchConfigs();
      } else {
        setError(data.message || '激活失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此模型配置吗？')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/llm?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchConfigs();
      } else {
        setError(data.message || '删除失败');
      }
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAi = async () => {
    setLoading(true);
    setTestResult('正在向模型发送测试请求...');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'summary',
          title: '信息技术高效课堂教学反思',
          instructorName: '教研员',
          date: '2026-09-15',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`连接成功！服务提供方：${data.provider}，生成内容正常。`);
      } else {
        setTestResult(`测试异常：${data.message}`);
      }
    } catch {
      setTestResult('测试请求超时或网络异常');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">大模型配置管理</h2>
          <button
            id="close-llm-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {testResult && (
            <div className="p-3 text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg flex items-center justify-between">
              <span>{testResult}</span>
              <button
                onClick={() => setTestResult(null)}
                className="text-indigo-400 hover:text-indigo-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section: 添加新配置 */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 mb-3">添加新配置</h3>
            <form onSubmit={handleAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">配置名称</label>
                <input
                  id="llm-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如: DeepSeek配置"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  id="llm-baseurl-input"
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                <input
                  id="llm-apikey-input"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  id="llm-modelname-input"
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="deepseek-chat 或 deepseek-v4-pro"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                />
              </div>

              <div className="pt-1 flex items-center gap-3">
                <button
                  id="submit-add-llm-btn"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg transition-colors disabled:opacity-50"
                >
                  添加配置
                </button>
                <button
                  id="test-llm-btn"
                  type="button"
                  onClick={handleTestAi}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  测试当前激活模型
                </button>
              </div>
            </form>
          </div>

          {/* Section: 现有配置 */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-blue-600 mb-3">现有配置</h3>
            <div className="space-y-3">
              {configs.length === 0 ? (
                <p className="text-sm text-gray-400">暂无配置，请在上方添加。</p>
              ) : (
                configs.map((cfg) => (
                  <div
                    key={cfg.id}
                    id={`llm-card-${cfg.id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      cfg.is_active === 1
                        ? 'border-blue-400 bg-blue-50/20 shadow-sm ring-1 ring-blue-400/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{cfg.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {cfg.model_name}
                        </span>
                      </div>
                      {cfg.is_active === 1 && (
                        <span className="px-2.5 py-0.5 text-xs font-medium text-white bg-[#10b981] rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          当前激活
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 break-all mb-3 font-mono">
                      Base URL: {cfg.base_url}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      {cfg.is_active !== 1 && (
                        <button
                          id={`activate-llm-btn-${cfg.id}`}
                          onClick={() => handleActivate(cfg.id)}
                          disabled={loading}
                          className="px-3 py-1 text-xs font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded transition-colors"
                        >
                          设为激活
                        </button>
                      )}
                      <button
                        id={`delete-llm-btn-${cfg.id}`}
                        onClick={() => handleDelete(cfg.id)}
                        disabled={loading}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

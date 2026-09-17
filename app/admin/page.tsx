'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Printer,
  Trash2,
  Upload,
  Plus,
  Settings,
  Users,
  Cpu,
  LogOut,
  ExternalLink,
  Calendar,
  Check,
  AlertCircle,
  Sparkles,
  Eye,
  Camera,
  Layers,
  FileCheck,
  Image as ImageIcon,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  X,
  Loader2,
} from 'lucide-react';
import { Activity, Member, UploadItem } from '@/lib/db';
import { resolveFileUrl } from '@/lib/utils';
import MemberManagementModal from '@/components/MemberManagementModal';
import DisplaySettingsModal from '@/components/DisplaySettingsModal';
import LlmConfigModal from '@/components/LlmConfigModal';
import TeachingPlanModal from '@/components/TeachingPlanModal';
import ListeningNotesModal from '@/components/ListeningNotesModal';
import LightboxModal from '@/components/LightboxModal';
import PrintView from '@/components/PrintView';
import SummaryPptModal from '@/components/SummaryPptModal';
import DragDropUploadBox from '@/components/DragDropUploadBox';
import { compressImageIfNeeded } from '@/lib/imageCompressor';

interface CurrentUser {
  id: number;
  name: string;
  role: 'admin' | 'member';
}

// Helper to retrieve auth token (localStorage or cookie or user-cache base64)
function getStoredAuthToken(fallbackUser?: CurrentUser | null): string | null {
  if (typeof window === 'undefined') return null;
  let token = localStorage.getItem('gpm_auth_token');
  if (token) return token;

  // Try document.cookie
  try {
    const match = document.cookie.match(/gpm_auth_session=([^;]+)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
      localStorage.setItem('gpm_auth_token', token);
      return token;
    }
  } catch {
    // ignore
  }

  // Fallback to user session in localStorage
  let u = fallbackUser;
  if (!u) {
    try {
      const cached = localStorage.getItem('gpm_auth_user');
      if (cached) u = JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  if (u && u.name && (u.role === 'admin' || u.role === 'member')) {
    try {
      token = btoa(unescape(encodeURIComponent(JSON.stringify({ id: u.id, name: u.name, role: u.role }))));
      localStorage.setItem('gpm_auth_token', token);
      return token;
    } catch {
      // ignore
    }
  }
  return null;
}

// Stable fetch wrapper that injects Authorization headers
function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredAuthToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-auth-token', token);
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });
}

export default function AdminPage() {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('gpm_auth_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.name) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [authChecking, setAuthChecking] = useState(true);

  // Login form state
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [hideBeforeDate, setHideBeforeDate] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  // Create Activity form state (matching Image 1)
  const [newTitle, setNewTitle] = useState('');
  const [newInstructorId, setNewInstructorId] = useState<number | ''>('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedListeners, setSelectedListeners] = useState<number[]>([]);
  const [autoGenerateAi, setAutoGenerateAi] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modals state
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [displayModalOpen, setDisplayModalOpen] = useState(false);
  const [llmModalOpen, setLlmModalOpen] = useState(false);
  const [teachingPlanModalAct, setTeachingPlanModalAct] = useState<Activity | null>(null);
  const [listeningNotesModalAct, setListeningNotesModalAct] = useState<Activity | null>(null);
  const [summaryPptModalAct, setSummaryPptModalAct] = useState<Activity | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');

  // Print state
  const [printActivities, setPrintActivities] = useState<Activity[]>([]);

  // Hidden file inputs for uploading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{
    activityId: number;
    memberId?: number | null;
    fileType: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // In-app Toast message state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // In-app Delete Confirmation Modal state (zero window.confirm dependency for iframe safety)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
    isProcessing?: boolean;
  } | null>(null);

  // 2. Fetch members and activities
  const loadData = async () => {
    try {
      setDataLoading(true);
      const [membersRes, actsRes] = await Promise.all([
        authFetch('/api/members'),
        authFetch('/api/activities?show_all=true'),
      ]);
      const membersData = await membersRes.json();
      const actsData = await actsRes.json();

      if (membersData.success) {
        setMembers(membersData.members || []);
      }
      if (actsData.success) {
        setActivities(actsData.activities || []);
        setHideBeforeDate(actsData.hideBeforeDate || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    authFetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.authenticated && data.user) {
            setUser(data.user);
            if (typeof window !== 'undefined') {
              localStorage.setItem('gpm_auth_user', JSON.stringify(data.user));
              getStoredAuthToken(data.user);
            }
          } else {
            const currentToken = getStoredAuthToken();
            if (!currentToken) {
              setUser(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('gpm_auth_user');
                localStorage.removeItem('gpm_auth_token');
              }
            }
          }
          setAuthChecking(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setAuthChecking(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    Promise.all([
      authFetch('/api/members').then((r) => r.json()),
      authFetch('/api/activities?show_all=true').then((r) => r.json()),
    ])
      .then(([membersData, actsData]) => {
        if (!ignore) {
          if (membersData.success) {
            setMembers(membersData.members || []);
          }
          if (actsData.success) {
            setActivities(actsData.activities || []);
            setHideBeforeDate(actsData.hideBeforeDate || null);
          }
          setDataLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        if (!ignore) setDataLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [user]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setLoginError('请输入账号和密码');
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.token) {
          localStorage.setItem('gpm_auth_token', data.token);
        } else {
          getStoredAuthToken(data.user);
        }
        localStorage.setItem('gpm_auth_user', JSON.stringify(data.user));
        setUsernameInput('');
        setPasswordInput('');
        showToast(`欢迎回来，${data.user.name}！`, 'success');
      } else {
        setLoginError(data.message || '登录失败');
      }
    } catch {
      setLoginError('网络请求异常，请稍后重试');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gpm_auth_token');
      localStorage.removeItem('gpm_auth_user');
    }
    setUser(null);
    showToast('已安全退出登录', 'info');
  };

  // When presenter is selected, exclude them from listeners automatically (as specified in Image 1 prompt)
  const handleInstructorChange = (instId: number | '') => {
    setNewInstructorId(instId);
    if (instId !== '') {
      setSelectedListeners((prev) => prev.filter((id) => id !== instId));
    }
  };

  // Toggle listener checkbox
  const toggleListener = (memberId: number) => {
    setSelectedListeners((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Select all other active members as listeners by default when presenter selected
  const activeMembers = members.filter((m) => m.status === 'active');

  // Handle Create Activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError('请填写活动主题');
      return;
    }
    if (!newInstructorId) {
      setCreateError('请选择授课人');
      return;
    }
    if (!newDate) {
      setCreateError('请选择活动日期');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      let aiPlan = '';
      let aiNote = '';

      // Optional AI Generation during creation
      if (autoGenerateAi) {
        const instMember = members.find((m) => m.id === Number(newInstructorId));
        const listenerNames = members
          .filter((m) => selectedListeners.includes(m.id))
          .map((m) => m.name);

        try {
          const [planRes, noteRes] = await Promise.all([
            authFetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'teaching_plan',
                title: newTitle.trim(),
                instructorName: instMember?.name || '授课教师',
                date: newDate,
              }),
            }),
            authFetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'listening_notes',
                title: newTitle.trim(),
                instructorName: instMember?.name || '授课教师',
                date: newDate,
                listeners: listenerNames,
              }),
            }),
          ]);

          const planData = await planRes.json();
          const noteData = await noteRes.json();
          if (planData.success) aiPlan = planData.content;
          if (noteData.success) aiNote = noteData.content;
        } catch {
          // tolerably fallback
        }
      }

      const res = await authFetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          instructor_id: Number(newInstructorId),
          activity_date: newDate,
          listener_ids: selectedListeners,
          ai_teaching_plan: aiPlan,
          ai_listening_note: aiNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewTitle('');
        setNewInstructorId('');
        setSelectedListeners([]);
        await loadData();
      } else {
        setCreateError(data.message || '创建活动失败');
      }
    } catch {
      setCreateError('网络请求失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Delete Activity (using in-app modal for iframe stability)
  const handleDeleteActivity = (id: number, title: string) => {
    setDeleteModal({
      isOpen: true,
      title: '确认删除教研活动',
      description: `确定要删除“${title}”及其关联的所有照片、总结材料和听课记录吗？此操作不可逆。`,
      confirmLabel: '确认删除活动',
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/activities/${id}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
            showToast('活动已成功删除', 'success');
            await loadData();
          } else {
            showToast(data.message || '删除失败', 'error');
          }
        } catch {
          showToast('删除活动请求异常', 'error');
        }
      },
    });
  };

  // Trigger file upload
  const triggerUpload = (activityId: number, fileType: string, memberId?: number | null) => {
    setUploadTarget({ activityId, fileType, memberId });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Direct upload for single or multiple files (parallel, fast, client-compressed)
  const handleDirectUpload = async (
    files: File[],
    activityId: number,
    fileType: string,
    memberId?: number | null
  ) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // 1. 客户端多图快速并行压缩 (基于 URL.createObjectURL，无主线程阻塞)
      const compressedFiles = await Promise.all(
        files.map(async (rawFile) => {
          try {
            return await compressImageIfNeeded(rawFile);
          } catch {
            return rawFile;
          }
        })
      );

      // 2. 并行上传云端
      const uploadPromises = compressedFiles.map(async (file) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('activity_id', String(activityId));
          formData.append('file_type', fileType);
          if (memberId) {
            formData.append('member_id', String(memberId));
          }

          const res = await authFetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          let data: { success?: boolean; message?: string } | null = null;
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            try {
              data = await res.json();
            } catch {
              data = null;
            }
          }

          if (res.ok && data?.success) {
            successCount++;
          } else {
            failCount++;
            console.warn(`Upload ${file.name} failed:`, data?.message || res.status);
          }
        } catch (e) {
          failCount++;
          console.error('Upload file network error:', e);
        }
      });

      await Promise.all(uploadPromises);

      // 3. 立即刷新数据
      await loadData();

      // 4. 给出明显友好的成功或异常反馈提示
      if (successCount > 0 && failCount === 0) {
        showToast(`🎉 成功上传 ${successCount} 个文件，已实时保存！`, 'success');
      } else if (successCount > 0 && failCount > 0) {
        showToast(`已成功上传 ${successCount} 个文件，${failCount} 个失败`, 'info');
      } else if (failCount > 0) {
        showToast('上传未成功，请检查文件格式或网络连接', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('上传处理遇到异常，请稍后重试', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Process file upload
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !uploadTarget) return;

    setUploading(true);
    try {
      const file = await compressImageIfNeeded(rawFile);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('activity_id', String(uploadTarget.activityId));
      formData.append('file_type', uploadTarget.fileType);
      if (uploadTarget.memberId) {
        formData.append('member_id', String(uploadTarget.memberId));
      }

      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let data: { success?: boolean; message?: string } | null = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (res.ok && data?.success) {
        await loadData();
        showToast(`🎉 文件“${rawFile.name}”上传成功！`, 'success');
      } else {
        showToast(data?.message || (res.status === 401 ? '登录状态已失效，请重新登录' : `上传失败 (HTTP ${res.status})`), 'error');
      }
    } catch (err) {
      console.error('Upload select error:', err);
      showToast('上传请求失败，请检查网络', 'error');
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  };

  // Delete upload item (using in-app modal)
  const handleDeleteUpload = (uploadId: number, itemName: string = '此文件') => {
    setDeleteModal({
      isOpen: true,
      title: '确认删除图片/文件',
      description: `确定要删除“${itemName}”吗？删除后将从当前活动和云端永久移除。`,
      confirmLabel: '确认删除',
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/upload/${uploadId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('图片/文件已成功删除', 'success');
            await loadData();
          } else {
            if (res.status === 401) {
              setUser(null);
              showToast('登录状态失效，请在弹窗中重新登录', 'error');
            } else {
              showToast(data.message || '删除失败', 'error');
            }
          }
        } catch {
          showToast('删除请求失败，请检查网络', 'error');
        }
      },
    });
  };

  // Print all or single
  const handlePrint = (actList: Activity[]) => {
    setPrintActivities(actList);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Save display settings
  const handleSaveDisplaySetting = async (date: string | null) => {
    await authFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'hide_before_date',
        value: date || '',
        action: date ? 'save' : 'delete',
      }),
    });
    await loadData();
  };

  // Save Teaching Plan
  const handleSaveTeachingPlan = async (actId: number, content: string) => {
    await authFetch(`/api/activities/${actId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_teaching_plan: content }),
    });
    await loadData();
  };

  // Save Listening Notes
  const handleSaveListeningNotes = async (actId: number, content: string) => {
    await authFetch(`/api/activities/${actId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listening_notes_template: content }),
    });
    await loadData();
  };

  // Regenerate AI listening notes
  const handleRegenerateListeningNotes = async (act: Activity) => {
    const res = await authFetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'listening_notes',
        title: act.title,
        instructorName: act.instructor_name || '授课教师',
        date: act.activity_date,
        listeners: act.listeners?.map((l) => l.name) || [],
      }),
    });
    const data = await res.json();
    if (data.success) {
      await handleSaveListeningNotes(act.id, data.content);
      return data.content;
    }
    return null;
  };

  // -------------------------------------------------------------
  // Render Login View if not authenticated
  // -------------------------------------------------------------
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#f3f4f8] flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="inline-block w-8 h-8 border-4 border-[#5b52a3] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">正在验证登录凭据...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3f4f8] flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#5b52a3] text-white p-6 text-center">
            <h1 className="text-xl font-bold tracking-wide">耿棚中学信息技术教研活动</h1>
            <p className="text-xs text-purple-200 mt-1">管理系统登录认证 (/admin)</p>
          </div>

          <div className="p-8">
            {loginError && (
              <div className="flex items-start gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg mb-4 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  账号 / 成员姓名
                </label>
                <input
                  id="admin-username-input"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="请输入账号或成员姓名"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  密码
                </label>
                <input
                  id="admin-password-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="请输入登录密码"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                  required
                />
              </div>

              <button
                id="submit-login-btn"
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 bg-[#5b52a3] hover:bg-[#4d4491] text-white font-medium rounded-lg text-sm shadow-md transition-colors disabled:opacity-50 mt-2"
              >
                {loginLoading ? '登录验证中...' : '登 录'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                ← 返回公开展示前台
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render Admin Dashboard matching Image 1
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f3f4f8] font-sans pb-20">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
      />

      {/* 1. Header Bar matching Image 1 */}
      <header className="no-print bg-[#5b52a3] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide">
              教研活动管理系统
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            {/* User badge */}
            <span
              id="current-user-badge"
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-medium border border-white/10"
            >
              当前用户: {user.name}
            </span>

            {/* Links & buttons */}
            <Link
              id="nav-view-frontend-link"
              href="/"
              target="_blank"
              className="px-3 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              查看前台
            </Link>

            {user.role === 'admin' && (
              <>
                <button
                  id="nav-member-manage-btn"
                  onClick={() => setMemberModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  成员管理
                </button>

                <button
                  id="nav-display-settings-btn"
                  onClick={() => setDisplayModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  显示设置
                </button>

                <button
                  id="nav-llm-config-btn"
                  onClick={() => setLlmModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  大模型配置
                </button>
              </>
            )}

            <button
              id="nav-logout-btn"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="no-print max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Uploading indicator */}
        {uploading && (
          <div className="fixed top-4 right-4 z-50 bg-[#5b52a3] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>文件上传处理中...</span>
          </div>
        )}

        {/* 2. "创建新活动" Card matching Image 1 (Only for Admin) */}
        {user.role === 'admin' && (
          <section className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-5">创建新活动</h2>

            {createError && (
              <div className="mb-4 flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateActivity} className="space-y-4">
              {/* Row 1: 活动主题, 授课人, 活动日期, 创建活动按钮 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    活动主题
                  </label>
                  <input
                    id="activity-title-input"
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例如: 1.1 数据及其特征"
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    授课人
                  </label>
                  <select
                    id="activity-instructor-select"
                    value={newInstructorId}
                    onChange={(e) =>
                      handleInstructorChange(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3] bg-white text-gray-800"
                  >
                    <option value="">请选择授课人</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    活动日期
                  </label>
                  <input
                    id="activity-date-input"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5b52a3]"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    id="submit-create-activity-btn"
                    type="submit"
                    disabled={createLoading}
                    className="w-full py-2 px-4 text-sm font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {createLoading ? '创建中...' : '创建活动'}
                  </button>
                </div>
              </div>

              {/* Row 2: 听课人（可多选） checkboxes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  听课人（可多选）
                </label>

                <div className="flex flex-wrap items-center gap-3 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl">
                  {activeMembers.map((member) => {
                    const isPresenter = newInstructorId === member.id;
                    const isChecked = selectedListeners.includes(member.id);

                    return (
                      <label
                        key={member.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all cursor-pointer select-none ${
                          isPresenter
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                            : isChecked
                            ? 'bg-purple-50 text-[#5b52a3] border-[#5b52a3] font-medium'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isPresenter}
                          checked={isChecked && !isPresenter}
                          onChange={() => toggleListener(member.id)}
                          className="rounded border-gray-300 text-[#5b52a3] focus:ring-[#5b52a3]"
                        />
                        <span>{member.name}</span>
                        {isPresenter && <span className="text-[10px] text-gray-400">(授课人)</span>}
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    提示：授课人不能同时是听课人，选择授课人后会自动排除
                  </p>
                  <label className="inline-flex items-center gap-1.5 text-xs text-purple-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateAi}
                      onChange={(e) => setAutoGenerateAi(e.target.checked)}
                      className="rounded text-[#5b52a3] focus:ring-[#5b52a3]"
                    />
                    <span>同时智能生成教案与听课记录样例 (大模型)</span>
                  </label>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* 3. "活动列表" Card matching Image 1 */}
        <section className="bg-white rounded-xl p-6 shadow-xs border border-gray-200">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">活动列表</h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                共 {activities.length} 期活动
              </span>
            </div>

            <button
              id="print-all-activities-btn"
              onClick={() => handlePrint(activities)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#10b981] hover:bg-[#059669] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              一键打印全部
            </button>
          </div>

          {/* Activities List */}
          {dataLoading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="inline-block w-6 h-6 border-2 border-[#5b52a3] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm">数据加载中...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
              暂无教研活动，请在上方创建新活动
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((act) => {
                const photos =
                  act.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
                const attendance = act.uploads?.find(
                  (u) => u.file_type === 'attendance_sheet'
                );
                const summaryImg = act.uploads?.find(
                  (u) => u.file_type === 'summary_image'
                );
                const pptUpload = act.uploads?.find((u) => u.file_type === 'ppt');
                const listeningNotes =
                  act.uploads?.filter((u) => u.file_type === 'listening_note') || [];

                const listenersText =
                  act.listeners && act.listeners.length > 0
                    ? act.listeners.map((l) => l.name).join('、')
                    : '暂无';

                const isPresenter = act.instructor_id === user.id;
                const isListener = act.listeners?.some((l) => l.id === user.id);
                const userRoleText =
                  user.role === 'admin'
                    ? '管理员'
                    : isPresenter
                    ? '授课人'
                    : isListener
                    ? '听课人'
                    : '观摩';

                return (
                  <div
                    key={act.id}
                    id={`admin-activity-row-${act.id}`}
                    className="p-5 sm:p-6 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-gray-300 transition-all space-y-5"
                  >
                    {/* Header Row matching Image 1 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-2.5 py-1 text-xs font-bold text-white bg-[#5b52a3] rounded">
                          第{act.id}次教研活动:
                        </span>
                        <h3 className="text-base sm:text-lg font-bold text-[#3b66d4]">
                          {act.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.role === 'admin' && (
                          <button
                            id={`delete-activity-btn-${act.id}`}
                            onClick={() => handleDeleteActivity(act.id, act.title)}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#dc2626] hover:bg-[#b91c1c] rounded transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Presenter & Listener info */}
                    <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm text-gray-600 gap-2">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          授课人:{' '}
                          <strong className="text-gray-800 font-semibold">
                            {act.instructor_name || '待定'}
                          </strong>
                        </span>
                        <span>
                          听课人: <span className="text-gray-700">{listenersText}</span>
                        </span>
                        <span>
                          日期: <span className="font-mono text-gray-700">{act.activity_date}</span>
                        </span>
                      </div>

                      {/* Role Pill matching Image 1 */}
                      <span className="px-3 py-1 text-xs font-medium text-white bg-[#2563eb] rounded">
                        你的角色: {userRoleText}
                      </span>
                    </div>

                    {/* Management & Upload Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {/* Block A: 现场照片 / 全员合影 */}
                      <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#5b52a3]" />
                            活动现场照片 ({photos.length})
                          </span>
                          <button
                            id={`upload-photo-btn-${act.id}`}
                            onClick={() => triggerUpload(act.id, 'activity_photo')}
                            className="px-2.5 py-1 text-xs text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            选择文件
                          </button>
                        </div>

                        {/* Drag and Drop Zone for Photos */}
                        <DragDropUploadBox
                          onUpload={(files) => handleDirectUpload(files, act.id, 'activity_photo')}
                          accept="image/*"
                          multiple={true}
                          label="直接拖入现场照片（支持多选）"
                          sublabel="可将微信聊天记录中的图片直接拖入立即上传"
                          colorTheme="purple"
                          compact={photos.length > 0}
                        />

                        {photos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {photos.map((p) => {
                              const src = resolveFileUrl(p.file_path);
                              return (
                                <div
                                  key={p.id}
                                  className="group relative rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100"
                                >
                                  <img
                                    src={src}
                                    alt={p.file_name}
                                    className="w-full h-full object-cover cursor-pointer"
                                    onClick={() => {
                                      setLightboxImage(src);
                                      setLightboxTitle(p.file_name);
                                    }}
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUpload(p.id, `现场照片 (${p.file_name})`);
                                    }}
                                    className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md p-1 shadow-md transition-all duration-150 flex items-center justify-center opacity-90 group-hover:opacity-100 hover:scale-105"
                                    title="删除此照片"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic py-1 text-center">暂无上传的照片</p>
                        )}
                      </div>

                      {/* Block B: 签到表与活动总结 */}
                      <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                          签到表与活动总结
                        </span>

                        <div className="space-y-2.5">
                          {/* 签到表项 */}
                          <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 font-medium">
                                签到表: {attendance ? '已上传' : '未上传'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {attendance && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const src = resolveFileUrl(attendance.file_path);
                                        setLightboxImage(src);
                                        setLightboxTitle('成员签到表');
                                      }}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      查看
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUpload(attendance.id, '成员签到表')}
                                      className="text-xs text-red-600 hover:underline"
                                    >
                                      删除
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => triggerUpload(act.id, 'attendance_sheet')}
                                  className="px-2 py-0.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                                >
                                  {attendance ? '重选' : '选择'}
                                </button>
                              </div>
                            </div>
                            <DragDropUploadBox
                              onUpload={(files) => handleDirectUpload(files, act.id, 'attendance_sheet')}
                              accept="image/*"
                              multiple={false}
                              label={attendance ? '拖入更换签到表' : '拖入上传签到表'}
                              sublabel="微信图片直接拖入立即上传"
                              colorTheme="emerald"
                              compact={true}
                            />
                          </div>

                          {/* 总结材料项 */}
                          <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 font-medium">
                                总结材料: {summaryImg ? '已上传' : '未上传'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {summaryImg && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const src = resolveFileUrl(summaryImg.file_path);
                                        setLightboxImage(src);
                                        setLightboxTitle('活动总结材料');
                                      }}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      查看
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUpload(summaryImg.id, '活动总结材料')}
                                      className="text-xs text-red-600 hover:underline"
                                    >
                                      删除
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => triggerUpload(act.id, 'summary_image')}
                                  className="px-2 py-0.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                                >
                                  {summaryImg ? '重选' : '选择'}
                                </button>
                              </div>
                            </div>
                            <DragDropUploadBox
                              onUpload={(files) => handleDirectUpload(files, act.id, 'summary_image')}
                              accept="image/*"
                              multiple={false}
                              label={summaryImg ? '拖入更换总结图' : '拖入上传总结图'}
                              sublabel="微信图片直接拖入立即上传"
                              colorTheme="indigo"
                              compact={true}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Block C: 教案与课件 PPT */}
                      <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          教学教案与课件资源
                        </span>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-gray-200">
                            <span className="text-gray-700 font-medium">电子教案</span>
                            <button
                              id={`open-teaching-plan-btn-${act.id}`}
                              onClick={() => setTeachingPlanModalAct(act)}
                              className="px-2.5 py-1 text-xs text-white bg-[#4975e8] hover:bg-[#3862cc] rounded flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" />
                              查看/编辑教案
                            </button>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 font-medium truncate max-w-[140px]">
                                课件PPT: {pptUpload ? pptUpload.file_name : '待上传'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {pptUpload && (
                                  <button
                                    onClick={() => handleDeleteUpload(pptUpload.id, `课件PPT (${pptUpload.file_name})`)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    删除
                                  </button>
                                )}
                                <button
                                  onClick={() => triggerUpload(act.id, 'ppt')}
                                  className="px-2 py-0.5 text-xs text-white bg-teal-600 hover:bg-teal-700 rounded"
                                >
                                  {pptUpload ? '重选' : '选择'}
                                </button>
                              </div>
                            </div>
                            <DragDropUploadBox
                              onUpload={(files) => handleDirectUpload(files, act.id, 'ppt')}
                              accept=".ppt,.pptx,.pdf"
                              multiple={false}
                              label={pptUpload ? '拖入更换PPT课件' : '拖入上传课件PPT'}
                              sublabel="支持.pptx/.ppt直接拖入"
                              colorTheme="teal"
                              compact={true}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Block D: 成员听课记录管理 (核心功能：管理员可为所有人传，成员登录可为自己传) */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#5b52a3]" />
                          成员听课记录管理
                        </h4>
                        <button
                          id={`open-listening-notes-btn-${act.id}`}
                          onClick={() => setListeningNotesModalAct(act)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          查看/编辑听课记录文字版样例 (AI生成)
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {act.listeners && act.listeners.length > 0 ? (
                          act.listeners.map((listener) => {
                            const note = listeningNotes.find(
                              (n) => n.member_id === listener.id
                            );
                            const canUploadThisMember =
                              user.role === 'admin' || user.id === listener.id;

                            if (note) {
                              const src = resolveFileUrl(note.file_path);
                              return (
                                <div
                                  key={listener.id}
                                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-center space-y-2"
                                >
                                  <div
                                    className="cursor-pointer rounded-lg overflow-hidden aspect-4/3 bg-gray-100 border relative group"
                                    onClick={() => {
                                      setLightboxImage(src);
                                      setLightboxTitle(`${listener.name} 听课笔记`);
                                    }}
                                  >
                                    <img
                                      src={src}
                                      alt={listener.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                                      查看大图
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-800">
                                      {listener.name}
                                    </span>
                                    {canUploadThisMember && (
                                      <button
                                        onClick={() => handleDeleteUpload(note.id, `${listener.name}的听课记录`)}
                                        className="text-xs text-red-500 hover:text-red-700"
                                        title="删除"
                                      >
                                        删除
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={listener.id}
                                className="p-3 bg-gray-50/80 border-2 border-dashed border-gray-200 rounded-xl text-center flex flex-col justify-between items-center min-h-32"
                              >
                                <div className="mb-2">
                                  <span className="text-xs font-semibold text-gray-700 block">
                                    {listener.name}
                                  </span>
                                  <span className="text-[11px] text-gray-400">听课记录待上传</span>
                                </div>

                                {canUploadThisMember ? (
                                  <div className="w-full">
                                    <DragDropUploadBox
                                      onUpload={(files) =>
                                        handleDirectUpload(files, act.id, 'listening_note', listener.id)
                                      }
                                      accept="image/*"
                                      multiple={false}
                                      label="拖入/上传笔记"
                                      sublabel="微信图片可直接拖入"
                                      colorTheme="purple"
                                      compact={true}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400">仅本人或管理员可传</span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="col-span-5 text-center text-xs text-gray-400 py-4">
                            本次活动未设置听课人
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action bar */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                      <Link
                        href="/"
                        target="_blank"
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                        前台展示效果
                      </Link>

                      <button
                        id={`open-summary-ppt-btn-${act.id}`}
                        onClick={() => setSummaryPptModalAct(act)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#e08e00] hover:bg-[#c97f00] rounded-lg flex items-center gap-1.5 shadow-xs transition-all hover:scale-105"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                        活动总结单页PPT (4图标准版)
                      </button>

                      <button
                        id={`print-single-act-btn-${act.id}`}
                        onClick={() => handlePrint([act])}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-[#5b52a3] hover:bg-[#4d4491] rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        打印本期教研记录
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 4. Modals */}
      <MemberManagementModal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        members={members}
        onRefresh={loadData}
      />

      <DisplaySettingsModal
        isOpen={displayModalOpen}
        onClose={() => setDisplayModalOpen(false)}
        currentHideBeforeDate={hideBeforeDate}
        onSave={handleSaveDisplaySetting}
      />

      <LlmConfigModal
        isOpen={llmModalOpen}
        onClose={() => setLlmModalOpen(false)}
      />

      {teachingPlanModalAct && (
        <TeachingPlanModal
          isOpen={Boolean(teachingPlanModalAct)}
          onClose={() => setTeachingPlanModalAct(null)}
          title={teachingPlanModalAct.title}
          instructorName={teachingPlanModalAct.instructor_name || '授课教师'}
          date={teachingPlanModalAct.activity_date}
          planContent={teachingPlanModalAct.ai_teaching_plan || ''}
          canEdit={user.role === 'admin'}
          activityId={teachingPlanModalAct.id}
          onSave={async (newContent) => {
            await handleSaveTeachingPlan(teachingPlanModalAct.id, newContent);
          }}
        />
      )}

      {listeningNotesModalAct && (
        <ListeningNotesModal
          isOpen={Boolean(listeningNotesModalAct)}
          onClose={() => setListeningNotesModalAct(null)}
          title={listeningNotesModalAct.title}
          instructorName={listeningNotesModalAct.instructor_name || '授课教师'}
          date={listeningNotesModalAct.activity_date}
          notesContent={listeningNotesModalAct.listening_notes_template || ''}
          canEdit={user.role === 'admin'}
          activityId={listeningNotesModalAct.id}
          onSave={async (newContent) => {
            await handleSaveListeningNotes(listeningNotesModalAct.id, newContent);
          }}
          onRegenerate={async () => {
            return await handleRegenerateListeningNotes(listeningNotesModalAct);
          }}
        />
      )}

      <LightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage || ''}
        title={lightboxTitle}
      />

      {summaryPptModalAct && (
        <SummaryPptModal
          isOpen={Boolean(summaryPptModalAct)}
          onClose={() => setSummaryPptModalAct(null)}
          activity={summaryPptModalAct}
          onOpenLightbox={(src, title) => {
            setLightboxImage(src);
            setLightboxTitle(title);
          }}
        />
      )}

      {/* In-app Delete Confirmation Dialog (Iframe safe) */}
      {deleteModal && deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{deleteModal.title}</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{deleteModal.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                disabled={deleteModal.isProcessing}
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeleteModal((prev) => (prev ? { ...prev, isProcessing: true } : null));
                  try {
                    await deleteModal.onConfirm();
                  } finally {
                    setDeleteModal(null);
                  }
                }}
                disabled={deleteModal.isProcessing}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {deleteModal.isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleteModal.confirmLabel || '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium transition-all duration-200 bg-white ${
            toast.type === 'success'
              ? 'border-emerald-200 text-emerald-800 shadow-emerald-500/10'
              : toast.type === 'error'
              ? 'border-red-200 text-red-800 shadow-red-500/10'
              : 'border-blue-200 text-blue-800 shadow-blue-500/10'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
            aria-label="关闭提示"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Print Sheet Formatted Component (Visible exclusively during window.print) */}
      <PrintView activities={printActivities} isAll={printActivities.length > 1} />
    </div>
  );
}

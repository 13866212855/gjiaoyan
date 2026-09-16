'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  ExternalLink,
  Lock,
  ChevronDown,
  Calendar,
  User,
  Users,
  Image as ImageIcon,
  CheckCircle2,
  Printer,
  Eye,
} from 'lucide-react';
import { Activity, UploadItem } from '@/lib/db';
import TeachingPlanModal from '@/components/TeachingPlanModal';
import ListeningNotesModal from '@/components/ListeningNotesModal';
import LightboxModal from '@/components/LightboxModal';

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [hideBeforeDate, setHideBeforeDate] = useState<string | null>(null);

  // Modals state
  const [teachingPlanOpen, setTeachingPlanOpen] = useState(false);
  const [listeningNotesOpen, setListeningNotesOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('');

  useEffect(() => {
    let ignore = false;
    const url = `/api/activities${showAll ? '?show_all=true' : ''}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setActivities(data.activities || []);
          setHideBeforeDate(data.hideBeforeDate || null);
          if (data.activities?.length > 0) {
            setSelectedActivityId((prev) => prev ?? data.activities[0].id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load activities:', err);
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [showAll]);

  const currentActivity =
    activities.find((a) => a.id === selectedActivityId) || activities[0] || null;

  const photos =
    currentActivity?.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
  const attendanceSheet = currentActivity?.uploads?.find(
    (u) => u.file_type === 'attendance_sheet'
  );
  const summaryImg = currentActivity?.uploads?.find(
    (u) => u.file_type === 'summary_image'
  );
  const pptUpload = currentActivity?.uploads?.find((u) => u.file_type === 'ppt');
  const listeningNotes =
    currentActivity?.uploads?.filter((u) => u.file_type === 'listening_note') || [];

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex flex-col font-sans">
      {/* 1. Header Banner matching Image 2 */}
      <header className="bg-[#5b52a3] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">
              耿棚中学信息技术教研活动展示
            </h1>
            <p className="text-sm sm:text-base text-purple-100/90 mt-1 font-light">
              记录每一次教研活动的精彩瞬间
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              id="goto-admin-btn"
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-all backdrop-blur-xs border border-white/20 shadow-xs"
            >
              <Lock className="w-4 h-4 text-purple-200" />
              管理后台
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Activity Session Switcher & Filter Notice */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-6">
        {hideBeforeDate && (
          <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <span>
              提示：前台当前仅显示 {hideBeforeDate} 之后的教研活动。
            </span>
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[#5b52a3] hover:underline font-semibold ml-2"
            >
              {showAll ? '恢复隐藏筛选' : '临时显示全部历史活动'}
            </button>
          </div>
        )}

        {/* If more than 1 activity, show selector pills */}
        {activities.length > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              期次切换:
            </span>
            {activities.map((act, index) => (
              <button
                key={act.id}
                id={`activity-pill-${act.id}`}
                onClick={() => setSelectedActivityId(act.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  (selectedActivityId === act.id || (!selectedActivityId && index === 0))
                    ? 'bg-[#5b52a3] text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                第{act.id}次：{act.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Main Content Card matching Image 2 */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-16">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
            <div className="inline-block w-8 h-8 border-4 border-[#5b52a3] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">正在加载教研活动资料...</p>
          </div>
        ) : !currentActivity ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 mb-4">暂无可展示的教研活动记录</p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5b52a3] text-white rounded-lg text-sm"
            >
              进入管理后台创建活动
            </Link>
          </div>
        ) : (
          <article
            id={`activity-card-${currentActivity.id}`}
            className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-10 space-y-7"
          >
            {/* Header: Title & Presenter & Date */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#3b66d4] tracking-tight">
                {currentActivity.title}
              </h2>
              <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                <span className="font-medium text-gray-700">
                  授课人: {currentActivity.instructor_name || '待定'}
                </span>
                <span className="text-gray-400 font-mono text-xs sm:text-sm">
                  {currentActivity.activity_date}
                </span>
              </div>
              {/* Blue divider line matching screenshot */}
              <div className="h-0.5 bg-[#4f7cf6]/60 w-full mt-3 mb-5" />
            </div>

            {/* Section 1: 教案 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-800">教案:</h3>
              <div>
                <button
                  id="view-lesson-plan-btn"
                  onClick={() => setTeachingPlanOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4975e8] hover:bg-[#3862cc] text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  查看电子教案
                </button>
              </div>
            </div>

            {/* Section 2: PPT */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-800">PPT:</h3>
              {pptUpload ? (
                <a
                  id="download-ppt-btn"
                  href={pptUpload.file_path.startsWith('/') ? pptUpload.file_path : `/${pptUpload.file_path}`}
                  download={pptUpload.file_name}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  下载课件PPT ({pptUpload.file_name})
                </a>
              ) : (
                <p className="text-sm text-gray-400 italic">待上传</p>
              )}
            </div>

            {/* Section 3: 现场照片 */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800">现场照片:</h3>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo, pIdx) => {
                    const src = photo.file_path.startsWith('/')
                      ? photo.file_path
                      : `/${photo.file_path}`;
                    return (
                      <div
                        key={photo.id}
                        id={`photo-thumb-${photo.id}`}
                        onClick={() => {
                          setLightboxImage(src);
                          setLightboxTitle(`现场照片 ${pIdx + 1} - ${currentActivity.title}`);
                        }}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-100 aspect-4/3 shadow-xs hover:shadow-md transition-all"
                      >
                        <img
                          src={src}
                          alt={photo.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                          <Eye className="w-4 h-4" />
                          点击查看大图
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-sm">
                  暂无现场照片
                </div>
              )}
            </div>

            {/* Section 4: 听课记录样例 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-800">听课记录样例:</h3>
              <div className="flex items-center gap-3">
                <button
                  id="view-listening-notes-sample-btn"
                  onClick={() => setListeningNotesOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#4975e8] hover:bg-[#3862cc] text-white rounded-lg text-sm font-medium shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  查看文字版样例
                </button>
                <span className="text-xs text-gray-400 font-medium">(AI生成)</span>
              </div>
            </div>

            {/* Section 5: 听课记录 (Grid of listeners) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">听课记录:</h3>
                {currentActivity.listeners && currentActivity.listeners.length > 0 && (
                  <span className="text-xs text-gray-400">
                    听课成员: {currentActivity.listeners.map((l) => l.name).join('、')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentActivity.listeners && currentActivity.listeners.length > 0 ? (
                  currentActivity.listeners.map((listener) => {
                    const noteUpload = listeningNotes.find(
                      (n) => n.member_id === listener.id
                    );

                    if (noteUpload) {
                      const src = noteUpload.file_path.startsWith('/')
                        ? noteUpload.file_path
                        : `/${noteUpload.file_path}`;
                      return (
                        <div
                          key={listener.id}
                          id={`listening-note-${listener.id}`}
                          onClick={() => {
                            setLightboxImage(src);
                            setLightboxTitle(`${listener.name} 教师听课记录`);
                          }}
                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white aspect-4/3 flex flex-col items-center justify-center p-2 shadow-xs hover:shadow-md transition-all"
                        >
                          <img
                            src={src}
                            alt={`${listener.name}听课记录`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-xs font-medium">
                            {listener.name}
                          </span>
                        </div>
                      );
                    }

                    // Matching Image 2 "待上传" dashed card
                    return (
                      <div
                        key={listener.id}
                        id={`empty-note-${listener.id}`}
                        className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 aspect-4/3 flex flex-col items-center justify-center text-center p-4 transition-colors"
                      >
                        <span className="text-xs font-medium text-gray-600 mb-1">
                          {listener.name}
                        </span>
                        <span className="text-xs text-gray-400">待上传</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 p-6 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-sm">
                    未指定听课人
                  </div>
                )}
              </div>
            </div>

            {/* Section 6: 签到表与总结材料（如果有） */}
            {(attendanceSheet || summaryImg) && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">活动资料存档:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {attendanceSheet && (
                    <div
                      onClick={() => {
                        const src = attendanceSheet.file_path.startsWith('/')
                          ? attendanceSheet.file_path
                          : `/${attendanceSheet.file_path}`;
                        setLightboxImage(src);
                        setLightboxTitle('成员签到表');
                      }}
                      className="cursor-pointer rounded-xl border border-gray-200 p-2 text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={
                          attendanceSheet.file_path.startsWith('/')
                            ? attendanceSheet.file_path
                            : `/${attendanceSheet.file_path}`
                        }
                        alt="签到表"
                        className="w-full h-36 object-cover rounded-lg mb-1"
                      />
                      <span className="text-xs font-medium text-gray-700">成员签到表 (点击放大)</span>
                    </div>
                  )}

                  {summaryImg && (
                    <div
                      onClick={() => {
                        const src = summaryImg.file_path.startsWith('/')
                          ? summaryImg.file_path
                          : `/${summaryImg.file_path}`;
                        setLightboxImage(src);
                        setLightboxTitle('活动总结材料');
                      }}
                      className="cursor-pointer rounded-xl border border-gray-200 p-2 text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <img
                        src={
                          summaryImg.file_path.startsWith('/')
                            ? summaryImg.file_path
                            : `/${summaryImg.file_path}`
                        }
                        alt="活动总结"
                        className="w-full h-36 object-cover rounded-lg mb-1"
                      />
                      <span className="text-xs font-medium text-gray-700">活动总结材料 (点击放大)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
        颍上县耿棚中学信息技术教研组 &copy; {new Date().getFullYear()} 教研活动记录系统
      </footer>

      {/* Modals */}
      {currentActivity && (
        <>
          <TeachingPlanModal
            isOpen={teachingPlanOpen}
            onClose={() => setTeachingPlanOpen(false)}
            title={currentActivity.title}
            instructorName={currentActivity.instructor_name || '授课教师'}
            date={currentActivity.activity_date}
            planContent={currentActivity.ai_teaching_plan || ''}
            canEdit={false}
          />

          <ListeningNotesModal
            isOpen={listeningNotesOpen}
            onClose={() => setListeningNotesOpen(false)}
            title={currentActivity.title}
            instructorName={currentActivity.instructor_name || '授课教师'}
            date={currentActivity.activity_date}
            notesContent={currentActivity.listening_notes_template || ''}
            canEdit={false}
          />
        </>
      )}

      <LightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage || ''}
        title={lightboxTitle}
      />
    </div>
  );
}

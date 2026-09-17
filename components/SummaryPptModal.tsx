'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Calendar,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { Activity } from '@/lib/db';

interface SummaryPptModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onOpenLightbox?: (url: string, title: string) => void;
}

export default function SummaryPptModal({
  isOpen,
  onClose,
  activity,
  onOpenLightbox,
}: SummaryPptModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !activity) return null;

  const photos = activity.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
  const attendanceUpload = activity.uploads?.find((u) => u.file_type === 'attendance_sheet');
  const summaryUpload = activity.uploads?.find((u) => u.file_type === 'summary_image');

  const photo1 = photos[0] || null;
  const photo2 = photos[1] || null;

  const photo1Src = photo1
    ? photo1.file_path.startsWith('/')
      ? photo1.file_path
      : `/${photo1.file_path}`
    : null;

  const photo2Src = photo2
    ? photo2.file_path.startsWith('/')
      ? photo2.file_path
      : `/${photo2.file_path}`
    : null;

  const attendanceSrc = attendanceUpload
    ? attendanceUpload.file_path.startsWith('/')
      ? attendanceUpload.file_path
      : `/${attendanceUpload.file_path}`
    : null;

  const summarySrc = summaryUpload
    ? summaryUpload.file_path.startsWith('/')
      ? summaryUpload.file_path
      : `/${summaryUpload.file_path}`
    : null;

  const listenerNames =
    activity.listeners && activity.listeners.length > 0
      ? activity.listeners.map((l) => l.name).join('、')
      : '全体教研组成员';

  // Count uploaded items out of 4
  const uploadedCount = [photo1, photo2, attendanceUpload, summaryUpload].filter(Boolean).length;

  const handleDownloadPpt = async () => {
    setDownloading(true);
    try {
      const exportUrl = `/api/activities/${activity.id}/export-ppt`;
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error('下载失败');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = activity.title.replace(/[\\/:*?"<>|]/g, '_');
      a.download = `耿棚中学教研活动总结_${activity.activity_date}_${safeTitle}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download PPT error:', err);
      alert('导出PPT失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#4A3E8F] to-[#5B52A3] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-wide">
                  活动总结单页 PPT 预览与导出
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-400 text-purple-950 rounded-full">
                  单页4图标准版
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                标准化排版：2张现场照片 + 1张签到表 + 1张总结图（已就绪 {uploadedCount}/4 张）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="export-ppt-modal-btn"
              onClick={handleDownloadPpt}
              disabled={downloading}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#4A3E8F] bg-amber-300 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? '正在生成PPT...' : '导出 PPT (.pptx)'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Slide View Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-gray-100/70 flex flex-col items-center">
          {/* Status Alert if some pictures are pending */}
          {uploadedCount < 4 && (
            <div className="w-full max-w-4xl mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">提示：</span>
                当前活动尚有部分图料未上传（已上传 {uploadedCount}
                /4）。您仍可直接导出当前PPT，未上传位置将展示标准留白占位；建议在管理后台直接将图片（支持微信聊天图片直接拖入）上传完整后导出，效果最佳。
              </div>
            </div>
          )}

          {/* 16:9 Standard Slide Container */}
          <div className="w-full max-w-4xl bg-[#F8F9FC] rounded-xl shadow-lg border border-gray-300 overflow-hidden flex flex-col aspect-16/9 relative select-none">
            {/* 1. Header Banner */}
            <div className="bg-[#4A3E8F] text-white px-5 py-3 relative border-b-2 border-[#E5A83B] flex items-center justify-between">
              <div>
                <h4 className="text-base sm:text-lg font-bold tracking-wide">
                  颍上县耿棚中学信息技术教研活动总结
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-purple-200 font-medium">
                  教研成果归档 · 单页总结汇报
                </span>
              </div>
            </div>

            {/* 2. Metadata Info Bar */}
            <div className="px-5 py-2">
              <div className="bg-[#EFEFF8] border border-[#D1D1EB] rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[#2D2B52] gap-y-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold">【活动主题】</span>
                  <span>{activity.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-bold">【执教教师】</span>
                    <span>{activity.instructor_name || '授课教师'}</span>
                  </div>
                  <div>
                    <span className="font-bold">【活动日期】</span>
                    <span>{activity.activity_date}</span>
                  </div>
                </div>
                <div className="w-full text-gray-600 truncate pt-0.5 border-t border-purple-100">
                  <span className="font-semibold text-[#2D2B52]">【听课人员】</span>
                  <span>{listenerNames}</span>
                </div>
              </div>
            </div>

            {/* 3. 4-Picture Grid (2x2) */}
            <div className="flex-1 px-5 pb-3 grid grid-cols-2 gap-3 min-h-0">
              {/* Card 1: 现场照片一 */}
              <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                <div className="bg-[#5B52A3] text-white px-2.5 py-1 text-[11px] font-bold flex items-center justify-between">
                  <span>活动现场照片（一）：课堂教学实况</span>
                  {photo1Src && (
                    <span className="text-[10px] font-normal text-purple-200">已就绪</span>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {photo1Src ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo1Src}
                        alt="现场照片一"
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(photo1Src, '活动现场照片（一）')
                        }
                      />
                      <button
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(photo1Src, '活动现场照片（一）')
                        }
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        查看原图
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400">
                      <p className="text-xs">【现场照片一】待补充上传</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        在后台可直接将微信聊天图片拖入上传
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: 现场照片二 */}
              <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                <div className="bg-[#5B52A3] text-white px-2.5 py-1 text-[11px] font-bold flex items-center justify-between">
                  <span>活动现场照片（二）：互动与评课实况</span>
                  {photo2Src && (
                    <span className="text-[10px] font-normal text-purple-200">已就绪</span>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {photo2Src ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo2Src}
                        alt="现场照片二"
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(photo2Src, '活动现场照片（二）')
                        }
                      />
                      <button
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(photo2Src, '活动现场照片（二）')
                        }
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        查看原图
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400">
                      <p className="text-xs">【现场照片二】待补充上传</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        在后台可直接将微信聊天图片拖入上传
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: 签到表 */}
              <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                <div className="bg-[#059669] text-white px-2.5 py-1 text-[11px] font-bold flex items-center justify-between">
                  <span>教研活动签到表：全员实名签到</span>
                  {attendanceSrc && (
                    <span className="text-[10px] font-normal text-emerald-100">已就绪</span>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {attendanceSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attendanceSrc}
                        alt="签到表"
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(attendanceSrc, '教研活动实名签到表')
                        }
                      />
                      <button
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(attendanceSrc, '教研活动实名签到表')
                        }
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        查看原图
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400">
                      <p className="text-xs">【签到表】待补充上传</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        支持将微信签到表截图直接拖入后台上传
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: 总结图 */}
              <div className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                <div className="bg-[#4338CA] text-white px-2.5 py-1 text-[11px] font-bold flex items-center justify-between">
                  <span>教研活动总结表：评课反馈与反思总结</span>
                  {summarySrc && (
                    <span className="text-[10px] font-normal text-indigo-100">已就绪</span>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden p-1.5 relative group">
                  {summarySrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={summarySrc}
                        alt="总结图"
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(summarySrc, '活动总结评价材料')
                        }
                      />
                      <button
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(summarySrc, '活动总结评价材料')
                        }
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        查看原图
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400">
                      <p className="text-xs">【活动总结表】待补充上传</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        支持将教研总结截图直接拖入后台上传
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-1.5 text-[10px] text-gray-400 bg-white/70 border-t border-gray-200">
              颍上县耿棚中学信息技术教研组 · 数字化校本教研纪实档案
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            * 导出的 PPT 文件为标准 <code className="bg-gray-200 px-1 py-0.5 rounded">.pptx</code>{' '}
            格式，可在 PowerPoint、WPS 或腾讯文档中直接打开或二次微调。
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
            >
              关闭
            </button>
            <button
              id="export-ppt-bottom-btn"
              onClick={handleDownloadPpt}
              disabled={downloading}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4A3E8F] hover:bg-[#3d3378] rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? '导出中...' : '立即导出本页PPT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

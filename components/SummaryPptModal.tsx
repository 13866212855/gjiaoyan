'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Maximize2,
  FileUp,
  Layers,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import JSZip from 'jszip';
import { Activity } from '@/lib/db';
import { resolveFileUrl } from '@/lib/utils';

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
  const [basePptFile, setBasePptFile] = useState<File | null>(null);
  const [basePptSlideCount, setBasePptSlideCount] = useState<number | null>(null);
  const [fileParsing, setFileParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !activity) return null;

  const photos = activity.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
  const attendanceUpload = activity.uploads?.find((u) => u.file_type === 'attendance_sheet');
  const summaryUpload = activity.uploads?.find((u) => u.file_type === 'summary_image');

  const photo1 = photos[0] || null;
  const photo2 = photos[1] || null;

  const photo1Src = photo1 ? resolveFileUrl(photo1.file_path) : null;
  const photo2Src = photo2 ? resolveFileUrl(photo2.file_path) : null;
  const attendanceSrc = attendanceUpload ? resolveFileUrl(attendanceUpload.file_path) : null;
  const summarySrc = summaryUpload ? resolveFileUrl(summaryUpload.file_path) : null;

  const listenerNames =
    activity.listeners && activity.listeners.length > 0
      ? activity.listeners.map((l) => l.name).join('、')
      : '全体教研组成员';

  // 已就绪图片数量统计
  const uploadedCount = [photo1, photo2, attendanceUpload, summaryUpload].filter(Boolean).length;

  // 处理导入之前导出的 PPT 文件
  const processPptFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      alert('请选择以 .pptx 格式结尾的 PowerPoint 文件');
      return;
    }

    setFileParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files).filter((f) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(f)
      );
      const count = slideFiles.length > 0 ? slideFiles.length : 1;
      setBasePptFile(file);
      setBasePptSlideCount(count);
    } catch (err) {
      console.error('Failed to parse base PPT:', err);
      alert('解析 PPT 文件结构失败，请确认导入的是标准的 .pptx 文件');
      setBasePptFile(null);
      setBasePptSlideCount(null);
    } finally {
      setFileParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPptFile(file);
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPptFile(file);
    }
  };

  const handleClearBasePpt = () => {
    setBasePptFile(null);
    setBasePptSlideCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 导出 PPT：支持单页独立导出，或合并追加到之前 PPT 后导出
  const handleDownloadPpt = async (mergeMode: boolean = false) => {
    setDownloading(true);
    try {
      const exportUrl = `/api/activities/${activity.id}/export-ppt`;
      let res: Response;
      const isMerging = mergeMode && !!basePptFile;

      if (isMerging) {
        const formData = new FormData();
        formData.append('base_pptx', basePptFile);
        res = await fetch(exportUrl, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(exportUrl);
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || '导出PPT失败');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = activity.title.replace(/[\\/:*?"<>|]/g, '_');
      a.download = isMerging
        ? `耿棚中学教研活动总结_累计上报_${activity.activity_date}_${safeTitle}.pptx`
        : `耿棚中学教研活动总结_${activity.activity_date}_${safeTitle}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Download PPT error:', err);
      alert(err instanceof Error ? err.message : '导出PPT失败，请稍后重试');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#4A3E8F] to-[#5B52A3] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg tracking-wide">
                  活动总结单页 PPT 预览与导出
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-400 text-purple-950 rounded-full">
                  手机端高清阅读优化版
                </span>
                {basePptFile && (
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-400 text-emerald-950 rounded-full flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    已启用追加合并模式
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                实名签到与评课反思超清通高展示 · 现场照片上下紧凑排列（已就绪 {uploadedCount}/4 张）
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {basePptFile ? (
              <button
                id="export-ppt-modal-merge-btn"
                onClick={() => handleDownloadPpt(true)}
                disabled={downloading}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Layers className="w-4 h-4" />
                {downloading ? '合并导出中...' : '追加并导出合并PPT'}
              </button>
            ) : (
              <button
                id="export-ppt-modal-btn"
                onClick={() => handleDownloadPpt(false)}
                disabled={downloading}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[#4A3E8F] bg-amber-300 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloading ? '正在生成PPT...' : '立即导出本页PPT'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Slide View Area & Merge Bar */}
        <div className="p-3 sm:p-5 overflow-y-auto bg-gray-100/80 flex flex-col items-center gap-3.5">
          {/* 隐藏的 PPT 文件上传 Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* 1. 导入之前PPT 功能卡片 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropFile}
            className={`w-full max-w-4xl transition-all duration-200 rounded-xl border ${
              basePptFile
                ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                : dragOver
                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300'
                : 'bg-white border-dashed border-gray-300 hover:border-purple-300 shadow-2xs'
            } p-3 sm:p-3.5`}
          >
            {basePptFile ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-emerald-950 truncate max-w-xs sm:max-w-md">
                        已载入已有PPT：{basePptFile.name}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200/80 text-emerald-900 rounded-full">
                        已有 {basePptSlideCount ?? 1} 页总结
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-tight">
                      【追加模式已就绪】点击导出时，系统将把本次教研总结单页自动追加为第{' '}
                      <span className="font-bold underline">
                        {(basePptSlideCount ?? 1) + 1}
                      </span>{' '}
                      页，一次性生成完整累计上报 PPT！
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={downloading}
                    className="px-2.5 py-1 text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors flex items-center gap-1"
                    title="更换导入的文件"
                  >
                    <RefreshCw className="w-3 h-3" />
                    更换
                  </button>
                  <button
                    onClick={handleClearBasePpt}
                    disabled={downloading}
                    className="px-2.5 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
                    title="取消追加模式"
                  >
                    <X className="w-3.5 h-3.5" />
                    清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#4A3E8F] flex items-center justify-center shrink-0">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-gray-800">
                        导入之前已生成的 PPT（可选 · 支持累计上报）
                      </span>
                      <span className="text-[10px] text-gray-400 hidden sm:inline">
                        (.pptx)
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                      若需将本次活动总结追加到之前已生成的 PPT 后面一起上报，请导入已有 PPT 文件。
                    </p>
                  </div>
                </div>

                <button
                  id="import-base-ppt-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileParsing || downloading}
                  className="px-3 py-1.5 text-xs font-semibold text-[#4A3E8F] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-colors self-end sm:self-center shrink-0"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  {fileParsing ? '正在解析...' : '导入之前PPT'}
                </button>
              </div>
            )}
          </div>

          {/* Status Alert if some pictures are pending */}
          {uploadedCount < 4 && (
            <div className="w-full max-w-4xl p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">提示：</span>
                当前活动尚有部分图料未上传（已就绪 {uploadedCount}
                /4）。您仍可直接导出，未就绪位置将展示占位；建议在管理后台将图片（支持微信聊天图片直接拖入）补充完整后导出，效果最佳。
              </div>
            </div>
          )}

          {/* 16:9 Standard Slide Container (手机端与PPT导出高精还原排版) */}
          <div className="w-full max-w-4xl bg-[#F8F9FC] rounded-xl shadow-lg border border-gray-300 overflow-hidden flex flex-col aspect-16/9 relative select-none">
            {/* 1. Header Banner */}
            <div className="bg-[#4A3E8F] text-white px-4 sm:px-5 py-2.5 relative border-b-2 border-[#E5A83B] flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-sm sm:text-base font-bold tracking-wide">
                  颍上县耿棚中学信息技术教研活动总结
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] sm:text-[11px] text-purple-200 font-medium">
                  教研成果归档 · 单页总结汇报
                </span>
              </div>
            </div>

            {/* 2. Metadata Info Bar */}
            <div className="px-4 sm:px-5 py-1.5 shrink-0">
              <div className="bg-[#EFEFF8] border border-[#D1D1EB] rounded-lg px-2.5 py-1 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] text-[#2D2B52] gap-y-0.5">
                <div className="flex items-center gap-1 truncate max-w-md">
                  <span className="font-bold">【活动主题】</span>
                  <span className="truncate">{activity.title}</span>
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
                <div className="w-full text-gray-600 truncate pt-0.5 border-t border-purple-100 text-[10px]">
                  <span className="font-semibold text-[#2D2B52]">【听课人员】</span>
                  <span>{listenerNames}</span>
                </div>
              </div>
            </div>

            {/* 3. 核心图卡排版：
                - 左列（约27%）：2张现场照片缩小、垂直上下排列，总面积与签到表差不多
                - 中列（约36.5%）：全员实名签到表通高放大，充满区域不留白，手机极清晰
                - 右列（约36.5%）：评课反馈与反思总结通高放大，充满区域不留白，手机极清晰
            */}
            <div className="flex-1 px-4 sm:px-5 pb-2.5 flex gap-2.5 min-h-0">
              {/* Column 1: 2张活动现场照片（上下垂直排列，整体缩减所占比例） */}
              <div className="w-[27%] flex flex-col gap-2 h-full min-h-0">
                {/* 现场照片（一） */}
                <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs min-h-0">
                  <div className="bg-[#5B52A3] text-white px-2 py-0.5 text-[10px] font-bold flex items-center justify-between shrink-0">
                    <span className="truncate">【现场实况一】课堂教学</span>
                    {photo1Src && (
                      <span className="text-[9px] font-normal text-purple-200 shrink-0">就绪</span>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative group min-h-0">
                    {photo1Src ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo1Src}
                          alt="现场照片一"
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() =>
                            onOpenLightbox && onOpenLightbox(photo1Src, '活动现场照片（一）')
                          }
                        />
                        <button
                          onClick={() =>
                            onOpenLightbox && onOpenLightbox(photo1Src, '活动现场照片（一）')
                          }
                          className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                          原图
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-1.5 text-gray-400 text-[10px]">
                        <p>【现场照片一】待上传</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 现场照片（二） */}
                <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs min-h-0">
                  <div className="bg-[#5B52A3] text-white px-2 py-0.5 text-[10px] font-bold flex items-center justify-between shrink-0">
                    <span className="truncate">【现场实况二】评课研讨</span>
                    {photo2Src && (
                      <span className="text-[9px] font-normal text-purple-200 shrink-0">就绪</span>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative group min-h-0">
                    {photo2Src ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo2Src}
                          alt="现场照片二"
                          className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() =>
                            onOpenLightbox && onOpenLightbox(photo2Src, '活动现场照片（二）')
                          }
                        />
                        <button
                          onClick={() =>
                            onOpenLightbox && onOpenLightbox(photo2Src, '活动现场照片（二）')
                          }
                          className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                          原图
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-1.5 text-gray-400 text-[10px]">
                        <p>【现场照片二】待上传</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: 全员实名签到表（大幅通高展示，充满区域不留白，手机清晰） */}
              <div className="w-[36.5%] flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs h-full min-h-0">
                <div className="bg-[#059669] text-white px-2.5 py-1 text-[10.5px] font-bold flex items-center justify-between shrink-0">
                  <span className="truncate">【教研签到】全员实名签到表</span>
                  {attendanceSrc && (
                    <span className="text-[9.5px] font-normal text-emerald-100 shrink-0">就绪</span>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative group min-h-0">
                  {attendanceSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attendanceSrc}
                        alt="实名签到表"
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(attendanceSrc, '教研活动实名签到表')
                        }
                      />
                      <button
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(attendanceSrc, '教研活动实名签到表')
                        }
                        className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3" />
                        查看清晰原图
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400">
                      <p className="text-xs">【签到表】待补充上传</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        微信签到表原图可直接拖入后台
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: 评课反馈与反思总结（大幅通高展示，充满区域不留白，手机清晰） */}
              <div className="w-[36.5%] flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs h-full min-h-0">
                <div className="bg-[#4338CA] text-white px-2.5 py-1 text-[10.5px] font-bold flex items-center justify-between shrink-0">
                  <span className="truncate">【评课反思】评课反馈与反思总结</span>
                  {summarySrc && (
                    <span className="text-[9.5px] font-normal text-indigo-100 shrink-0">就绪</span>
                  )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative group min-h-0">
                  {summarySrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={summarySrc}
                        alt="总结与反思评价表"
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(summarySrc, '活动总结评价材料')
                        }
                      />
                      <button
                        onClick={() =>
                          onOpenLightbox && onOpenLightbox(summarySrc, '活动总结评价材料')
                        }
                        className="absolute bottom-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-sm"
                      >
                        <Maximize2 className="w-3 h-3" />
                        查看清晰原图
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-3 text-gray-400">
                      <p className="text-xs">【活动总结表】待补充上传</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        教研反思评价截图可直接拖入后台
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-1 text-[9px] text-gray-400 bg-white/70 border-t border-gray-200 shrink-0">
              颍上县耿棚中学信息技术教研组 · 数字化校本教研纪实档案
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>
              图片已优化为满屏贴合展示；导出的 <code className="bg-gray-200 px-1 py-0.5 rounded">.pptx</code>{' '}
              在手机 WPS 或 PowerPoint 中可高清缩放。
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
            >
              关闭
            </button>
            {basePptFile && (
              <button
                id="export-ppt-bottom-single-btn"
                onClick={() => handleDownloadPpt(false)}
                disabled={downloading}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                仅导出本页
              </button>
            )}
            <button
              id="export-ppt-bottom-btn"
              onClick={() => handleDownloadPpt(!!basePptFile)}
              disabled={downloading}
              className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 ${
                basePptFile
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#4A3E8F] hover:bg-[#3d3378]'
              }`}
            >
              {basePptFile ? (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  {downloading ? '合并导出中...' : '追加并导出合并PPT'}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {downloading ? '导出中...' : '立即导出本页PPT'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

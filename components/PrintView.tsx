'use client';

import React from 'react';
import { Activity } from '@/lib/db';

interface PrintViewProps {
  activities: Activity[];
  isAll?: boolean;
}

export default function PrintView({ activities, isAll = false }: PrintViewProps) {
  if (!activities || activities.length === 0) return null;

  return (
    <div className="print-only p-8 max-w-4xl mx-auto bg-white text-black">
      {activities.map((act, index) => {
        const photos = act.uploads?.filter((u) => u.file_type === 'activity_photo') || [];
        const attendance = act.uploads?.find((u) => u.file_type === 'attendance_sheet');
        const summaryImg = act.uploads?.find((u) => u.file_type === 'summary_image');
        const listeningNotes = act.uploads?.filter((u) => u.file_type === 'listening_note') || [];
        const listenersText = act.listeners?.map((l) => l.name).join('、') || '教研组全体成员';

        return (
          <div
            key={act.id}
            className={`${index > 0 ? 'page-break mt-10 pt-6' : ''}`}
            style={{ fontFamily: 'SimSun, "Songti SC", "PingFang SC", sans-serif' }}
          >
            {/* Title Header */}
            <div className="text-center pb-4 border-b-2 border-black mb-6">
              <h1 className="text-2xl font-bold tracking-wider mb-2">
                颍上县耿棚中学信息技术教研活动记录表
              </h1>
              <div className="flex justify-between text-sm text-gray-700 px-2 mt-2">
                <span>教研组：信息技术教研组</span>
                <span>活动期次：第 {act.id} 期</span>
                <span>活动日期：{act.activity_date}</span>
              </div>
            </div>

            {/* Core Info Table */}
            <table className="w-full border-collapse border border-black text-sm mb-6">
              <tbody>
                <tr>
                  <td className="border border-black bg-gray-100 font-bold p-2.5 w-24 text-center">
                    活动主题
                  </td>
                  <td className="border border-black p-2.5 font-semibold text-base" colSpan={3}>
                    {act.title}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 font-bold p-2.5 text-center">
                    授课教师
                  </td>
                  <td className="border border-black p-2.5 w-1/3">
                    {act.instructor_name || '授课教师'}
                  </td>
                  <td className="border border-black bg-gray-100 font-bold p-2.5 w-24 text-center">
                    活动地点
                  </td>
                  <td className="border border-black p-2.5">
                    多媒体机房（高一3班）
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 font-bold p-2.5 text-center">
                    听课人员
                  </td>
                  <td className="border border-black p-2.5" colSpan={3}>
                    {listenersText}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-gray-100 font-bold p-2.5 text-center">
                    主要活动流程
                  </td>
                  <td className="border border-black p-2.5 leading-relaxed" colSpan={3}>
                    1. 执教教师课堂教学展示（课题：《{act.title}》）<br />
                    2. 教研组听课教师随堂观摩并记录机房教学情况<br />
                    3. 课后组织评课与集中研讨反思<br />
                    4. 归档教学设计、课件、签到表及听课笔记
                  </td>
                </tr>
                {act.listening_notes_template && (
                  <tr>
                    <td className="border border-black bg-gray-100 font-bold p-2.5 text-center">
                      听课评课记录
                    </td>
                    <td className="border border-black p-2.5 leading-relaxed text-xs whitespace-pre-wrap" colSpan={3}>
                      {act.listening_notes_template.slice(0, 650)}
                      {act.listening_notes_template.length > 650 ? '...' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Photos & Sign-in Scans Section */}
            <div className="mb-6">
              <h2 className="font-bold text-base border-b border-black pb-1 mb-3">
                活动现场照片与影像资料
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {photos.slice(0, 4).map((p, idx) => (
                  <div key={p.id} className="border border-gray-300 p-1 text-center">
                    <img
                      src={p.file_path.startsWith('/') ? p.file_path : `/${p.file_path}`}
                      alt={`现场照片 ${idx + 1}`}
                      className="w-full h-44 object-cover"
                    />
                    <div className="text-xs text-gray-600 mt-1">现场活动照片 {idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance & Summary Photos if available */}
            {(attendance || summaryImg) && (
              <div className="mb-6">
                <h2 className="font-bold text-base border-b border-black pb-1 mb-3">
                  成员签到表与总结材料
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {attendance && (
                    <div className="border border-gray-300 p-1 text-center">
                      <img
                        src={attendance.file_path.startsWith('/') ? attendance.file_path : `/${attendance.file_path}`}
                        alt="签到表"
                        className="w-full h-48 object-cover"
                      />
                      <div className="text-xs text-gray-600 mt-1">教研活动全员签到表</div>
                    </div>
                  )}
                  {summaryImg && (
                    <div className="border border-gray-300 p-1 text-center">
                      <img
                        src={summaryImg.file_path.startsWith('/') ? summaryImg.file_path : `/${summaryImg.file_path}`}
                        alt="活动总结"
                        className="w-full h-48 object-cover"
                      />
                      <div className="text-xs text-gray-600 mt-1">教研活动总结材料</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Member listening notes images */}
            {listeningNotes.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold text-base border-b border-black pb-1 mb-3">
                  各教师随堂听课记录实存
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {listeningNotes.map((ln) => (
                    <div key={ln.id} className="border border-gray-300 p-1 text-center">
                      <img
                        src={ln.file_path.startsWith('/') ? ln.file_path : `/${ln.file_path}`}
                        alt={ln.file_name}
                        className="w-full h-44 object-cover"
                      />
                      <div className="text-xs text-gray-700 mt-1 font-medium">
                        听课教师：{ln.member_name || '教研教师'} 听课手记
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between items-center text-sm pt-6 border-t border-gray-400 mt-8">
              <div>执教教师签字：_______________</div>
              <div>教研组长签字：_______________</div>
              <div>教务教导处审阅：_______________</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

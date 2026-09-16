import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: '耿棚中学信息技术教研活动记录',
  description: '耿棚中学信息技术教研活动记录与管理系统，支持教研活动展示、全员合影、签到表、电子教案、听课记录管理、一键打印及大模型智能配置。',
  openGraph: {
    title: '耿棚中学信息技术教研活动记录',
    description: '耿棚中学信息技术教研活动记录与管理系统，支持教研活动展示、全员合影、签到表、电子教案、听课记录管理、一键打印及大模型智能配置。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '耿棚中学信息技术教研活动记录',
    description: '耿棚中学信息技术教研活动记录与管理系统，支持教研活动展示、全员合影、签到表、电子教案、听课记录管理、一键打印及大模型智能配置。',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

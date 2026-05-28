import './globals.css';

export const metadata = {
  title: 'AgentHub - AI 协作工作台',
  description: 'Multi-Agent collaboration platform with IM chat paradigm',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

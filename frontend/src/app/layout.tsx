import './globals.css';
import { Providers } from './providers';

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

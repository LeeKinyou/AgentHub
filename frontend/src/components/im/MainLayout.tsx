'use client';

import type { ReactNode } from 'react';

interface MainLayoutProps {
  projectDock: ReactNode;
  fileExplorer?: ReactNode;
  contextSidebar: ReactNode;
  chatArea: ReactNode;
  rightPanel: ReactNode;
  isFilesExpanded: boolean;
  isRightPanelOpen: boolean;
}

export function MainLayout({
  projectDock,
  fileExplorer,
  contextSidebar,
  chatArea,
  rightPanel,
  isFilesExpanded,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-minimal-bg dark:bg-minimal-dark-bg text-minimal-text dark:text-minimal-dark-text">
      {projectDock}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <div className="flex-1 flex min-h-0 w-full overflow-hidden">
          {fileExplorer && (
            <div className={`${isFilesExpanded ? 'w-60' : 'w-0'} h-full border-r border-minimal-glass-border dark:border-minimal-dark-border overflow-hidden transition-all duration-300 shrink-0 bg-minimal-glass/50 dark:bg-minimal-dark-glass/50 backdrop-blur-xl`}>
              {fileExplorer}
            </div>
          )}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 flex min-h-0">
              {contextSidebar}
              {chatArea}
              {rightPanel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

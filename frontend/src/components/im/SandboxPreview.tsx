'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface SandboxPreviewProps {
  htmlContent: string;
  className?: string;
}

export function SandboxPreview({ htmlContent, className = '' }: SandboxPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = htmlContent;
  }, [htmlContent]);

  useEffect(() => {
    updateIframe();
  }, [updateIframe]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'sandbox-update' && iframeRef.current) {
        iframeRef.current.srcdoc = e.data.html;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      iframeRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        <button
          onClick={toggleFullscreen}
          className="px-2 py-1 text-[10px] rounded bg-white/80 dark:bg-minimal-dark-surface/80 backdrop-blur border border-minimal-border dark:border-minimal-dark-border text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-200"
        >
          {isFullscreen ? 'Exit' : 'Expand'}
        </button>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        className="w-full h-full border-0 rounded-lg bg-white"
        title="Sandbox Preview"
      />
    </div>
  );
}

'use client';

import { useState, useCallback, useRef } from 'react';
import type { FileOperation } from '@/components/im/FileOperationDialog';

const FILE_OP_REGEX = /@file_operation\s*(\{[\s\S]*?\})/g;

/**
 * Strip all @file_operation directives from message content for display.
 * Returns the cleaned content with file operations removed.
 */
export function stripFileOperations(content: string): string {
  return content.replace(/@file_operation\s*\{[\s\S]*?\}/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function useFileOperations() {
  const [pendingOps, setPendingOps] = useState<FileOperation[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  // Auto-approve: skip dialog and directly apply all operations
  const autoApproveRef = useRef(false);
  const [autoApprove, setAutoApproveState] = useState(false);
  const onApprovedRef = useRef<((ops: FileOperation[]) => void) | null>(null);

  const setAutoApprove = useCallback((val: boolean) => {
    autoApproveRef.current = val;
    setAutoApproveState(val);
  }, []);

  const setOnApproved = useCallback((fn: (ops: FileOperation[]) => void) => {
    onApprovedRef.current = fn;
  }, []);

  const parseFileOperations = useCallback((content: string): FileOperation[] => {
    const ops: FileOperation[] = [];
    let match;
    const regex = /@file_operation\s*(\{[\s\S]*?\})/g;
    while ((match = regex.exec(content)) !== null) {
      try {
        const op = JSON.parse(match[1]) as FileOperation;
        if (op.action && op.path) {
          ops.push(op);
        }
      } catch {
        // Ignore malformed JSON
      }
    }
    return ops;
  }, []);

  const requestFileOperations = useCallback((content: string) => {
    const ops = parseFileOperations(content);
    if (ops.length > 0) {
      if (autoApproveRef.current) {
        // Auto-approve: apply directly without dialog
        onApprovedRef.current?.(ops);
        return true;
      }
      setPendingOps(ops);
      setShowDialog(true);
      return true;
    }
    return false;
  }, [parseFileOperations]);

  const approveOperations = useCallback((ops: FileOperation[]) => {
    setShowDialog(false);
    setPendingOps([]);
    return ops;
  }, []);

  const rejectOperations = useCallback(() => {
    setShowDialog(false);
    setPendingOps([]);
  }, []);

  return {
    pendingOps,
    showDialog,
    autoApprove,
    requestFileOperations,
    approveOperations,
    rejectOperations,
    setAutoApprove,
    setOnApproved,
  };
}

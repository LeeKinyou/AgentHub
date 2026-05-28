import type { FileNode } from './mockFiles';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', 'venv']);

export async function traverseDirectory(dirHandle: FileSystemDirectoryHandle): Promise<FileNode[]> {
  const children: FileNode[] = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const subChildren = await traverseDirectory(entry as FileSystemDirectoryHandle);
        children.push({ name: entry.name, type: 'dir', children: subChildren });
      } else {
        children.push({ name: entry.name, type: 'file', fileHandle: entry as FileSystemFileHandle });
      }
    }
  } catch (err) {
    console.error('读取目录失败:', err);
  }

  return children.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });
}

export async function openDirectoryPicker(): Promise<FileNode | null> {
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    const children = await traverseDirectory(dirHandle);
    return { name: dirHandle.name, type: 'dir', children };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    console.error('打开文件夹失败:', err);
    return null;
  }
}

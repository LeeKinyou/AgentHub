import type { FileNode } from './mockFiles';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', 'venv']);

export async function traverseDirectory(dirHandle: FileSystemDirectoryHandle): Promise<FileNode[]> {
  const children: FileNode[] = [];

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'directory') {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const subChildren = await traverseDirectory(entry as FileSystemDirectoryHandle);
        children.push({ name: entry.name, type: 'dir', children: subChildren, dirHandle: entry as FileSystemDirectoryHandle });
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
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const children = await traverseDirectory(dirHandle);
    return { name: dirHandle.name, type: 'dir', children, dirHandle };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    console.error('打开文件夹失败:', err);
    return null;
  }
}

/**
 * Navigate a directory handle through a path like "src/components/App.tsx".
 * Returns the parent directory handle and the final file name.
 * Creates intermediate directories if `create` is true.
 */
export async function resolvePath(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
  create = false,
): Promise<{ parentDir: FileSystemDirectoryHandle; fileName: string }> {
  const parts = filePath.split('/').filter(Boolean);
  let current = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i], { create });
  }
  return { parentDir: current, fileName: parts[parts.length - 1] };
}

/**
 * Write content to a file at the given path inside a directory handle.
 * Creates intermediate directories and the file if they don't exist.
 */
export async function writeFileAtPath(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
  content: string,
): Promise<void> {
  const { parentDir, fileName } = await resolvePath(rootDir, filePath, true);
  const fileHandle = await parentDir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Delete a file at the given path inside a directory handle.
 */
export async function deleteFileAtPath(
  rootDir: FileSystemDirectoryHandle,
  filePath: string,
): Promise<void> {
  const { parentDir, fileName } = await resolvePath(rootDir, filePath, false);
  await parentDir.removeEntry(fileName);
}

export interface FileNode {
  name: string;
  type: 'file' | 'dir';
  children?: FileNode[];
  fileHandle?: FileSystemFileHandle;
  dirHandle?: FileSystemDirectoryHandle;
}

export const rootA: FileNode = {
  name: 'my-next-app',
  type: 'dir',
  children: [
    {
      name: 'src',
      type: 'dir',
      children: [
        { name: 'app', type: 'dir', children: [{ name: 'page.tsx', type: 'file' }, { name: 'layout.tsx', type: 'file' }] },
        { name: 'components', type: 'dir', children: [{ name: 'Button.tsx', type: 'file' }] },
      ],
    },
    { name: 'package.json', type: 'file' },
    { name: 'README.md', type: 'file' },
  ],
};

import { lstat, realpath } from 'node:fs/promises';
import { relative, resolve, dirname, isAbsolute, sep } from 'node:path';
import { validateDataPath } from './dataReferences';
export const MAX_FILE_BYTES=1024*1024;
export const MAX_TOTAL_BYTES=4*1024*1024;
export const MAX_FILES=16;
export function inside(root:string, path:string):boolean {const rel=relative(root,path);return rel!=='' && !rel.startsWith('..'+sep) && rel!=='..' && !isAbsolute(rel);}
/** Trusted local workspaces only. No symlink components below the workspace root. */
export async function validateLocalFile(root:string, document:string, operand:string):Promise<string> {
  const target=resolve(dirname(document),validateDataPath(operand));
  if(!inside(root,target)) throw new Error('Data file is outside this Markdown document’s workspace folder.');
  const canonicalRoot=await realpath(root);
  let cursor=root;
  const parts=relative(root,target).split(sep);
  for(const part of parts) {cursor=resolve(cursor,part);const info=await lstat(cursor);if(info.isSymbolicLink())throw new Error('Symlink data paths are not supported.');}
  const canonical=await realpath(target);
  if(!inside(canonicalRoot,canonical))throw new Error('Data file resolves outside the workspace folder.');
  return target;
}

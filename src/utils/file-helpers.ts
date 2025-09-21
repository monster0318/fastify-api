import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}

export interface VirusScanResult {
  clean: boolean;
  threats?: string[];
}

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 5;

export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }
  
  const sanitized = filename
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
    .trim();
    
  return sanitized.length > 0 && sanitized.length <= 255 
    ? sanitized 
    : `file_${Date.now()}`;
}

export function isValidFileType(mimeType: string): boolean {
  const isValid = SUPPORTED_DOCUMENT_TYPES.includes(mimeType as any);
  return isValid;
}

export function isValidFileSize(size: number): boolean {
  const isValid = size > 0 && size <= MAX_FILE_SIZE;
  return isValid;
}

export function generateSecureFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const uuid = randomUUID().slice(0, 8);
  const extension = path.extname(sanitized);
  const basename = path.basename(sanitized, extension);
  
  return `${timestamp}_${uuid}_${basename}${extension}`;
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fsp.access(dirPath);
  } catch {
    await fsp.mkdir(dirPath, { recursive: true });
  }
}

export async function writeFileSafely(
  filePath: string,
  buffer: Buffer,
  originalName: string
): Promise<FileUploadResult> {
  try {
    const dirPath = path.dirname(filePath);
    await ensureDirectoryExists(dirPath);
    
    await fsp.writeFile(filePath, buffer);
    
    const stats = await fsp.stat(filePath);
    
    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
      originalName,
      size: stats.size,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown file write error'
    };
  }
}

export async function deleteFileSafely(filePath: string): Promise<boolean> {
  try {
    await fsp.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

export function createFileStream(filePath: string) {
  try {
    return fs.createReadStream(filePath);
  } catch (error) {
    throw new Error(`Failed to create file stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

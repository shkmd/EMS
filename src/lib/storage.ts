import "server-only"

import { mkdir, writeFile, unlink, readFile, stat } from "node:fs/promises"
import { join, normalize, resolve } from "node:path"
import { randomUUID } from "node:crypto"

import { getEnv } from "@/config/env"
import { ValidationError } from "@/lib/errors"

function uploadRoot() {
  return resolve(process.cwd(), getEnv().UPLOAD_DIR)
}

/**
 * Resolves a stored relative path back to an absolute one, refusing
 * anything that would escape the upload root (defense in depth — callers
 * only ever pass back paths we generated ourselves, never raw user input).
 */
function resolveSafePath(relativePath: string) {
  const root = uploadRoot()
  const absolute = normalize(join(root, relativePath))
  if (!absolute.startsWith(root)) {
    throw new ValidationError("Invalid file path")
  }
  return absolute
}

export async function saveUploadedFile(
  buffer: Buffer,
  subDir: string,
  originalName: string
): Promise<{ relativePath: string; fileName: string }> {
  const safeSubDir = subDir.replace(/[^a-zA-Z0-9/_-]/g, "")
  const extension = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : ""
  const fileName = `${randomUUID()}${extension}`
  const relativePath = join(safeSubDir, fileName)

  const absoluteDir = resolveSafePath(safeSubDir)
  await mkdir(absoluteDir, { recursive: true })
  await writeFile(resolveSafePath(relativePath), buffer)

  return { relativePath, fileName }
}

export async function readUploadedFile(relativePath: string) {
  return readFile(resolveSafePath(relativePath))
}

export async function deleteUploadedFile(relativePath: string) {
  try {
    await unlink(resolveSafePath(relativePath))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

export async function fileExists(relativePath: string) {
  try {
    await stat(resolveSafePath(relativePath))
    return true
  } catch {
    return false
  }
}

const EXTENSION_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export function mimeTypeFromExtension(path: string) {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase()
  return EXTENSION_MIME_TYPES[extension] ?? "application/octet-stream"
}

export const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function assertAllowedFile(file: { size: number; type: string }, allowedMimeTypes: string[]) {
  const env = getEnv()
  const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024

  if (file.size > maxBytes) {
    throw new ValidationError(`File is too large. Maximum size is ${env.MAX_UPLOAD_SIZE_MB}MB.`)
  }
  if (!allowedMimeTypes.includes(file.type)) {
    throw new ValidationError(`Unsupported file type: ${file.type || "unknown"}`)
  }
}

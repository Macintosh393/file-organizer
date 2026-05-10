import fs from "node:fs/promises";

export async function isValidDir(path) {
  try {
    const stats = await fs.stat(path);
    if (stats.isDirectory()) {
      return true;
    } else {
      throw new Error(`Not a directory: ${path}`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Directory not found: ${path}`);
    } else if (error.code === "EACCES") {
      throw new Error(`Permission denied: ${path}`);
    } else if (error.message.startsWith("Not a directory")) {
      throw error;
    } else {
      throw new Error(`Cannot access directory: ${path}`);
    }
  }
}

export function validateDays(value) {
  const days = parseInt(value, 10);
  if (isNaN(days) || days < 0) {
    throw new Error(
      `--older-than must be a non-negative integer, got "${value}"`,
    );
  }
  return days;
}

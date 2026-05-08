import fs from "fs/promises";

export async function isValidDir(path) {
  const stats = await fs.stat(path);
  if (stats.isDirectory()) {
    return true;
  } else {
    throw new Error("Parameter must be a path to an existing directory");
  }
}

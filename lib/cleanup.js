import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

export default class Cleanup extends EventEmitter {
  async cleanup(directory, threshold) {
    this.emit("cleanup-start", { directory, threshold });

    let upForDeletion = [];

    let files = await fs.readdir(directory, { recursive: true });
    files = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        return stats.isFile() ? file : null;
      }),
    );
    files = files.filter((file) => file !== null);

    for (const [index, file] of files.entries()) {
      const filePath = path.join(directory, file);
      const fileStats = await fs.stat(filePath);
      const mtime = fileStats.mtime;

      const fileAge = Math.floor(
        (Date.now() - mtime.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (fileAge > threshold) {
        upForDeletion.push({
          filePath,
          fileRelName: path.relative(directory, filePath),
          fileAge,
          fileModified: `${mtime.getFullYear()}-${(mtime.getMonth() + 1).toString().padStart(2, "0")}-${mtime.getDate().toString().padStart(2, "0")}`,
          fileSize: fileStats.size,
        });
      }

      this.emit("file-checked", {
        fileStats,
        current: index + 1,
        total: files.length,
      });
    }

    upForDeletion.sort((a, b) => b.fileAge - a.fileAge);

    this.emit("cleanup-complete", {
      directory,
      upForDeletion,
      totalFiles: upForDeletion.length,
      totalSize: upForDeletion.reduce((acc, file) => acc + file.fileSize, 0),
    });

    return upForDeletion;
  }

  async deleteFiles(upToDelete) {
    this.emit("delete-start", {
      totalFiles: upToDelete.length,
      totalSize: upToDelete.reduce((acc, file) => acc + file.fileSize, 0),
    });
    let totalSize = 0;

    for (const [index, file] of upToDelete.entries()) {
      await fs.unlink(file.filePath);
      totalSize += file.fileSize;
      this.emit("file-deleted", {
        file,
        current: index + 1,
        total: upToDelete.length,
      });
    }

    this.emit("delete-complete", {
      totalFiles: upToDelete.length,
      totalSize,
    });
  }
}

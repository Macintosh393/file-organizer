import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

export default class Cleanup extends EventEmitter {
  async cleanup(directory, threshold) {
    try {
      this.emit("cleanup-start", { directory, threshold });

      let upForDeletion = [];

      let files;
      try {
        files = await fs.readdir(directory, { recursive: true });
      } catch (error) {
        if (error.code === "ENOENT") {
          throw new Error(`Directory not found: ${directory}`);
        } else if (error.code === "EACCES") {
          throw new Error(`Permission denied: ${directory}`);
        } else {
          throw error;
        }
      }

      files = await Promise.all(
        files.map(async (file) => {
          try {
            const filePath = path.join(directory, file);
            const stats = await fs.stat(filePath);
            return stats.isFile() ? file : null;
          } catch (error) {
            if (error.code === "EACCES") {
              console.warn(`⚠️  Warning: Permission denied: ${file}`);
              return null;
            }
            throw error;
          }
        }),
      );
      files = files.filter((file) => file !== null);

      for (const [index, file] of files.entries()) {
        const filePath = path.join(directory, file);
        let fileStats;
        try {
          fileStats = await fs.stat(filePath);
        } catch (error) {
          if (error.code === "EACCES") {
            console.warn(`⚠️  Warning: Permission denied: ${file}`);
            continue;
          }
          throw error;
        }

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
      const upForDeletionSize = upForDeletion.reduce(
        (acc, file) => acc + file.fileSize,
        0,
      );

      this.emit("cleanup-complete", {
        directory,
        upForDeletion,
        totalFiles: upForDeletion.length,
        totalSize: upForDeletionSize,
      });

      return { upForDeletion, upForDeletionSize };
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  async deleteFiles(upForDeletion, upForDeletionSize) {
    try {
      this.emit("delete-start", {
        totalFiles: upForDeletion.length,
        totalSize: upForDeletionSize,
      });
      let totalSize = 0;

      for (const [index, file] of upForDeletion.entries()) {
        try {
          await fs.unlink(file.filePath);
          totalSize += file.fileSize;
        } catch (error) {
          if (error.code === "EACCES") {
            console.warn(`⚠️  Warning: Permission denied when deleting: ${file.fileRelName}`);
            continue;
          } else if (error.code === "ENOENT") {
            console.warn(`⚠️  Warning: File not found: ${file.fileRelName}`);
            continue;
          } else {
            throw error;
          }
        }

        this.emit("file-deleted", {
          file,
          current: index + 1,
          total: upForDeletion.length,
        });
      }

      this.emit("delete-complete", {
        totalFiles: upForDeletion.length,
        totalSize,
      });
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
}

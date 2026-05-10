import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";

export default class Scanner extends EventEmitter {
  async scan(directory) {
    try {
      this.emit("scan-start", { directory });

      const dirStats = {
        totalFiles: 0,
        totalSize: 0,
        extensions: {},
        ages: {
          under7: 0,
          under30: 0,
          over90: 0,
        },
        largest: [],
        oldest: {
          name: null,
          modified: 0,
        },
      };

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

        dirStats.totalFiles += 1;
        dirStats.totalSize += fileStats.size;

        const extension =
          path.extname(file).length > 0
            ? path.extname(file).toLowerCase()
            : "No extension";
        dirStats.extensions[extension] ??= { totalFiles: 0, totalSize: 0 };
        dirStats.extensions[extension].totalFiles += 1;
        dirStats.extensions[extension].totalSize += fileStats.size;

        const fileAge = Math.floor(
          (Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (fileAge <= 7) {
          dirStats.ages.under7 += 1;
        } else if (fileAge <= 30) {
          dirStats.ages.under30 += 1;
        } else if (fileAge > 90) {
          dirStats.ages.over90 += 1;
        }

        if (fileAge > dirStats.oldest.modified) {
          dirStats.oldest.name = path.relative(directory, filePath);
          dirStats.oldest.modified = fileAge;
        }

        let candidateFile = {
          file: path.relative(directory, filePath),
          size: fileStats.size,
        };
        dirStats.largest.push(candidateFile);
        dirStats.largest.sort((a, b) => b.size - a.size);
        if (dirStats.largest.length > 3) {
          dirStats.largest.pop();
        }

        this.emit("file-found", {
          fileStats,
          current: index + 1,
          total: files.length,
        });
      }

      this.emit("scan-complete", dirStats);
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
}

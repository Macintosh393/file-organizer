import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export default class DuplicateFinder extends EventEmitter {
  async findDuplicates(directory) {
    try {
      this.emit("duplicates-start", { directory });

      const duplicates = {};
      let totalSize = 0;

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

        let hash;
        try {
          hash = await this.constructor.#calculateHash(filePath);
        } catch (error) {
          if (error.code === "EACCES") {
            console.warn(
              `⚠️  Warning: Permission denied when reading: ${file}`,
            );
            continue;
          }
          throw error;
        }

        if (duplicates[hash]) {
          totalSize += fileStats.size;
        }

        duplicates[hash] ??= { files: [], fileSize: null };
        duplicates[hash].files.push(path.relative(directory, filePath));
        duplicates[hash].fileSize ??= fileStats.size;

        this.emit("file-processed", {
          fileStats,
          current: index + 1,
          total: files.length,
        });
      }

      this.emit("duplicates-found", { duplicates, totalSize });
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  static #calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = createReadStream(filePath);

      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", reject);
    });
  }
}

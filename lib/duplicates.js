import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export default class DuplicateFinder extends EventEmitter {
  async findDuplicates(directory) {
    this.emit("duplicates-start", { directory });

    const duplicates = {};
    let totalSize = 0;

    const files = await fs.readdir(directory, { recursive: true });

    for (const [index, file] of files.entries()) {
      const filePath = path.join(directory, file);
      const fileStats = await fs.stat(filePath);

      if (!fileStats.isFile()) {
        continue;
      }

      const hash = await this.constructor.#calculateHash(filePath);

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

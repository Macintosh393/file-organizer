import { EventEmitter } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export default class Organizer extends EventEmitter {
  async organize(directory, output) {
    this.emit("copy-start", { directory, output });

    const categories = {
      Documents: [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx"],
      Images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"],
      Archives: [".zip", ".rar", ".tar", ".gz", ".7z"],
      Code: [".js", ".py", ".java", ".cpp", ".html", ".css", ".json"],
      Videos: [".mp4", ".avi", ".mkv", ".mov", ".webm"],
      Other: [],
    };

    let totalSize = 0;
    const summary = {};

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

      const extension = path.extname(file).toLowerCase();

      let category = "Other";
      for (const [cat, extensions] of Object.entries(categories)) {
        if (extensions.includes(extension)) {
          category = cat;
          break;
        }
      }

      const destDir = path.join(output, category);
      await fs.mkdir(destDir, { recursive: true });
      let destPath = path.join(destDir, path.basename(file));
      let copyIndex = 1;

      while (
        await fs
          .access(destPath)
          .then(() => true)
          .catch(() => false)
      ) {
        const parsed = path.parse(destPath);
        const newName = `${parsed.name.replace(/\([0-9]+\)$/g, "")}(${copyIndex})${parsed.ext}`;
        destPath = path.join(destDir, newName);
        copyIndex += 1;
      }

      if (fileStats.size < 10 * 1024 * 1024) {
        await fs.copyFile(filePath, destPath);
      } else {
        await pipeline(createReadStream(filePath), createWriteStream(destPath));
      }

      summary[category] ??= { count: 0, path: destDir };
      summary[category].count += 1;

      totalSize += fileStats.size;
      this.emit("copy-progress", {
        fileStats,
        current: index + 1,
        total: files.length,
      });
    }

    this.emit("copy-complete", {
      output,
      summary,
      totalSize,
      totalFiles: files.length,
    });
  }
}

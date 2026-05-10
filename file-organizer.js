import { Command } from "commander";
import Scanner from "./lib/scanner.js";
import DuplicateFinder from "./lib/duplicates.js";
import Organizer from "./lib/organizer.js";
import Cleanup from "./lib/cleanup.js";

import drawProgressBar from "./util/draw-progress.js";
import { isValidDir, validateDays } from "./util/validators.js";
import { formatSize } from "./util/formatters.js";

const program = new Command();

program
  .name("file-organizer")
  .description("CLI tool to organize files in Node.js")
  .version("1.0.0");

program
  .command("scan <directory>")
  .description("Scan a directory for files with details and stats")
  .action(async (directory) => {
    try {
      await isValidDir(directory);
    } catch (error) {
      console.error(`\u274c Error: ${error.message}`);
      process.exit(1);
    }
    const scanner = new Scanner();

    scanner.on("scan-start", (data) => {
      console.log(`📂 Scanning: ${data.directory}`);
    });

    scanner.on("file-found", (data) => {
      process.stdout.write(
        "\rProcessing... " + drawProgressBar(data.current, data.total),
      );
    });

    scanner.on("scan-complete", (data) => {
      console.log("\n\n📊 Scan Results:");
      console.log("━".repeat(34));
      console.log(`Total files: ${data.totalFiles}`);
      console.log(`Total size: ${formatSize(data.totalSize)}`);

      console.log("\nBy File Type:");
      Object.entries(data.extensions)
        .sort((a, b) => b[1].totalSize - a[1].totalSize)
        .forEach(([ext, value]) => {
          console.log(
            `\t${ext.padEnd(20, " ")} ${value.totalFiles.toString().padStart(3, " ")} files ${formatSize(value.totalSize).padStart(3, " ")}`,
          );
        });

      console.log("\nFile Age:");
      console.log(
        `\tLast 7 days:   ${data.ages.under7.toString().padStart(4, " ")}`,
      );
      console.log(
        `\tLast 30 days:  ${data.ages.under30.toString().padStart(4, " ")}`,
      );
      console.log(
        `\tOlder than 90: ${data.ages.over90.toString().padStart(4, " ")}`,
      );

      console.log("\nLargest files:");
      data.largest.forEach((file, index) => {
        console.log(
          `\t${index + 1}. ${file.file.padEnd(40, " ")} ${formatSize(file.size).padStart(3, " ")}`,
        );
      });

      console.log(
        `\nOldest file: ${data.oldest.name} (modified ${data.oldest.modified} days ago)`,
      );
    });

    scanner.on("error", (error) => {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    });

    await scanner.scan(directory);
  });

program
  .command("duplicates <directory>")
  .description("Find duplicates by hash and report wasted space")
  .action(async (directory) => {
    try {
      await isValidDir(directory);
    } catch (error) {
      console.error(`\u274c Error: ${error.message}`);
      process.exit(1);
    }
    const duplicateFinder = new DuplicateFinder();

    duplicateFinder.on("duplicates-start", (data) => {
      console.log(`🔍 Searching for duplicates in: ${data.directory}`);
    });

    duplicateFinder.on("file-processed", (data) => {
      process.stdout.write(
        "\rCalculating hashes... " + drawProgressBar(data.current, data.total),
      );
    });

    duplicateFinder.on("duplicates-found", (data) => {
      const { duplicates, totalSize } = data;

      const duplicateEntries = Object.entries(duplicates)
        .filter(([, value]) => value.files.length > 1)
        .sort((a, b) => b[1].fileSize - a[1].fileSize);
      if (duplicateEntries.length === 0) {
        console.log("\n\nNo duplicates found.");
        return;
      }

      console.log(
        `\n\nFound ${duplicateEntries.length} duplicate groups (${formatSize(totalSize)} wasted):`,
      );

      duplicateEntries.forEach(([hash, value], index) => {
        console.log("\n" + "━".repeat(34));
        console.log(
          `Group ${index + 1} (${value.files.length} copies, ${formatSize(value.fileSize)} each):`,
        );

        console.log(`\tSHA256: ${hash}\n`);
        value.files.forEach((file) => {
          console.log(`\t📄 ${file}`);
        });

        console.log(
          `\n\tWasted space: ${formatSize(value.fileSize * (value.files.length - 1))}`,
        );
      });

      console.log("\n" + "━".repeat(34));
      console.log(`\n💾 Total wasted space: ${formatSize(totalSize)}`);
    });

    duplicateFinder.on("error", (error) => {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    });

    await duplicateFinder.findDuplicates(directory);
  });

program
  .command("organize <directory>")
  .description("Organize directory into output path by categories")
  .requiredOption("--output <path>", "Destination path")
  .action(async (directory, options) => {
    try {
      await isValidDir(directory);
    } catch (error) {
      console.error(`\u274c Error: ${error.message}`);
      process.exit(1);
    }
    const organizer = new Organizer();

    organizer.on("copy-start", (data) => {
      console.log(`📦 Organizing: ${data.directory}`);
      console.log(`Target: ${data.output}\n`);
    });

    organizer.on("copy-progress", (data) => {
      process.stdout.write(
        `\rCopying files... ${drawProgressBar(data.current, data.total)}`,
      );
    });

    organizer.on("copy-complete", (data) => {
      console.log(`\n\n✅ Organization complete!`);

      console.log(`\nSummary:`);
      Object.entries(data.summary).forEach(([category, value]) => {
        console.log(
          `\t${category.padEnd(15, " ")} ${value.count.toString().padStart(3, " ")} files → ${value.path}`,
        );
      });

      console.log(
        `\nTotal copied: ${data.totalFiles} (${formatSize(data.totalSize)})`,
      );
    });

    organizer.on("error", (error) => {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    });

    await organizer.organize(directory, options.output);
  });

program
  .command("cleanup <directory>")
  .description(
    "Cleanup the directory from files older than specified number of days",
  )
  .requiredOption(
    "--older-than <days>",
    "Number of days that file should be older in order to be flagged",
    validateDays,
  )
  .option("--confirm", "Option to actualy remove the flagged files")
  .action(async (directory, options) => {
    try {
      await isValidDir(directory);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
    const cleanup = new Cleanup();

    cleanup.on("cleanup-start", (data) => {
      console.log(`🧹 Cleanup: ${data.directory}\n`);
      console.log(`Looking for files older than ${data.threshold} days...`);
    });

    cleanup.on("file-checked", (data) => {
      process.stdout.write(
        `\rChecking files... ${drawProgressBar(data.current, data.total)}`,
      );
    });

    cleanup.on("cleanup-complete", (data) => {
      console.log(`\n\nFound ${data.totalFiles} files to delete:`);
      console.log("\n" + "━".repeat(34));

      data.upForDeletion.forEach((file, index) => {
        console.log("\n" + file.fileRelName);
        console.log(`\tSize: ${formatSize(file.fileSize)}`);
        console.log(
          `\tModified: ${file.fileAge} days ago (${file.fileModified})`,
        );
      });

      console.log("\n" + "━".repeat(34));
      console.log(
        `Total: ${data.totalFiles} files (${formatSize(data.totalSize)})`,
      );
    });

    cleanup.on("delete-start", (data) => {
      console.log(
        `\n⚠️  DELETING ${data.totalFiles} files (${formatSize(data.totalSize)}). This action cannot be undone!\n`,
      );
    });

    cleanup.on("file-deleted", (data) => {
      process.stdout.write(
        `\rDeleting... ${drawProgressBar(data.current, data.total)}`,
      );
    });

    cleanup.on("delete-complete", (data) => {
      console.log(`\n\n✅ Deletion complete!`);
      console.log(
        `Deleted: ${data.totalFiles} files (${formatSize(data.totalSize)} freed)`,
      );
    });

    cleanup.on("error", (error) => {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    });

    const { upForDeletion, upForDeletionSize } = await cleanup.cleanup(
      directory,
      options.olderThan,
    );

    if (options.confirm && upForDeletion.length > 0) {
      await cleanup.deleteFiles(upForDeletion, upForDeletionSize);
    } else if (options.confirm) {
      console.log("\nNo files to delete.");
    } else {
      console.log("\n⚠️  DRY RUN MODE: No files were deleted.");
      console.log(`To actually delete these files, run with --confirm flag.`);
    }
  });

program.parse();

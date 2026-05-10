import { Command } from "commander";
import Scanner from "./lib/scanner.js";
import drawProgressBar from "./util/draw-progress.js";
import { isValidDir } from "./util/validators.js";
import { formatSize } from "./util/formatters.js";
import DuplicateFinder from "./lib/duplicates.js";

const program = new Command();

program
  .name("file-organizer")
  .description("CLI tool to organize files in Node.js")
  .version("1.0.0");

program
  .command("scan <directory>")
  .description("Scan a directory for files")
  .action(async (directory) => {
    await isValidDir(directory);
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

    await scanner.scan(directory);
  });

program
  .command("duplicates <directory>")
  .description("Find duplicates")
  .action(async (directory) => {
    await isValidDir(directory);
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

    await duplicateFinder.findDuplicates(directory);
  });

program
  .command("organize <directory>")
  .description("Organize directory into output path")
  .requiredOption("--output <path>", "Destination path")
  .action((directory) => {});

program
  .command("cleanup <directory>")
  .description("Cleanup the directory")
  .requiredOption(
    "--older-than <days>",
    "Number of days that file should be older in order to be flagged",
  )
  .option("--confirm", "Option to actualy remove the flagged files")
  .action((directory, options) => {});

program.parse();

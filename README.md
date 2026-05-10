# file-organizer

A powerful Node.js CLI tool for managing, organizing, and analyzing files in your directories. Quickly scan directories for detailed statistics, find duplicate files, organize files by category, and safely clean up old files.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [scan](#scan-command)
  - [duplicates](#duplicates-command)
  - [organize](#organize-command)
  - [cleanup](#cleanup-command)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Features

- 📂 **Scan directories** - Get detailed statistics about files, sizes, types, and ages
- 🔍 **Find duplicates** - Identify duplicate files by SHA256 hash and calculate wasted space
- 📦 **Organize files** - Automatically categorize files into folders (Documents, Images, Code, etc.)
- 🧹 **Cleanup old files** - Safely identify and remove files older than specified days
- 📊 **Real-time progress** - Visual progress bars for long-running operations
- ⚠️ **Robust error handling** - Comprehensive error handling with permission checks and helpful error messages

## Project Structure

```
file-organizer/
├── file-organizer.js          # Main CLI entry point
├── package.json               # Project dependencies and metadata
├── README.md                  # This file
│
├── lib/                       # Core functionality modules
│   ├── scanner.js             # Directory scanning and analysis
│   ├── duplicates.js          # Duplicate file detection
│   ├── organizer.js           # File organization by category
│   └── cleanup.js             # File cleanup by age
│
└── util/                      # Utility functions
    ├── draw-progress.js       # Progress bar rendering
    ├── formatters.js          # Output formatting utilities
    └── validators.js          # Input validation functions
```

### Module Descriptions

**lib/scanner.js**

- Recursively scans directories
- Collects file statistics (count, total size, by extension)
- Tracks file ages and finds largest/oldest files
- Emits progress events during scanning

**lib/duplicates.js**

- Finds duplicate files using SHA256 hashing
- Groups identical files together
- Calculates wasted space from duplicates
- Handles large files efficiently

**lib/organizer.js**

- Organizes files into predefined categories (Documents, Images, Code, Videos, Archives, Other)
- Handles file conflicts with numbering
- Supports files under and over 10MB with appropriate copy methods
- Provides detailed organization summary

**lib/cleanup.js**

- Identifies files older than specified threshold
- Supports dry-run mode (preview without deletion)
- Safe deletion with confirmation
- Tracks deletion progress and freed space

**util/validators.js**

- `isValidDir()` - Validates directory existence and accessibility
- `validateDays()` - Validates non-negative integer for age threshold

**util/formatters.js**

- `formatSize()` - Converts bytes to human-readable format (B, KB, MB, GB)

**util/draw-progress.js**

- Renders console progress bars for file operations
- Shows current/total file count

## Installation

### Prerequisites

- Node.js 14+ (uses ESM modules)
- npm 6+

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd file-organizer
```

2. Install dependencies:

```bash
npm install
```

3. Verify installation:

```bash
node file-organizer.js --help
```

## Quick Start

### Basic Commands

```bash
# Scan a directory for statistics
node file-organizer.js scan /path/to/directory

# Find duplicate files
node file-organizer.js duplicates /path/to/directory

# Organize files into categories
node file-organizer.js organize /path/to/directory --output ./Organized/

# Preview files to be deleted (dry run)
node file-organizer.js cleanup /path/to/directory --older-than 365

# Actually delete files older than 1 year
node file-organizer.js cleanup /path/to/directory --older-than 365 --confirm
```

## Commands

### scan Command

Scans a directory recursively and generates detailed file statistics.

**Usage:**

```bash
node file-organizer.js scan <directory>
```

**Arguments:**

- `<directory>` - Path to directory to scan (required)

**Output includes:**

- Total file count and combined size
- Breakdown by file extension with file counts and sizes (sorted by size)
- Files grouped by age (last 7 days, last 30 days, older than 90 days)
- Top 3 largest files with relative paths
- Oldest file with modification date

**Examples:**

```bash
# Scan current directory
node file-organizer.js scan .

# Scan Downloads folder
node file-organizer.js scan C:\Users\maxko\Downloads

# Scan absolute path
node file-organizer.js scan /home/user/Documents
```

**Sample Output:**

```
📂 Scanning: C:\Users\maxko\Downloads
Processing... ████████████████████ 126/126 files

📊 Scan Results:
══════════════════════════════════

Total files: 126
Total size: 260.5 KB

By File Type:
        .js                20 files 150.3 KB
        .png                45 files 85.2 KB
        .pdf                 5 files 25.0 KB
        No extension        56 files 0.0 B

File Age:
        Last 7 days:      42
        Last 30 days:     38
        Older than 90:    46

Largest files:
        1. document.pdf              25.0 KB
        2. image.png                 15.3 KB
        3. archive.zip               10.2 KB

Oldest file: old_file.txt (modified 245 days ago)
```

---

### duplicates Command

Finds duplicate files by calculating SHA256 hashes and reports wasted disk space.

**Usage:**

```bash
node file-organizer.js duplicates <directory>
```

**Arguments:**

- `<directory>` - Path to directory to scan (required)

**Output includes:**

- Number of duplicate groups found
- Total wasted space from duplicates
- For each duplicate group:
  - Group number and number of copies
  - SHA256 hash of the file
  - List of file paths (relative to scan directory)
  - Wasted space calculation

**Examples:**

```bash
# Find duplicates in current directory
node file-organizer.js duplicates .

# Find duplicates in Documents
node file-organizer.js duplicates ~/Documents

# Find duplicates recursively in large directory
node file-organizer.js duplicates /var/backups
```

**Sample Output:**

```
🔍 Searching for duplicates in: C:\Users\maxko\Downloads
Calculating hashes... ████████████████████ 126/126 files

Found 3 duplicate groups (5.2 MB wasted):

══════════════════════════════════
Group 1 (3 copies, 1.5 MB each):
        SHA256: a1b2c3d4e5f6...

        📄 backup_1/image.jpg
        📄 backup_2/image.jpg
        📄 Documents/image.jpg

        Wasted space: 3.0 MB

══════════════════════════════════
Group 2 (2 copies, 2.0 MB each):
        SHA256: f6e5d4c3b2a1...

        📄 project/archive.zip
        📄 old_backups/archive.zip

        Wasted space: 2.0 MB

══════════════════════════════════

💾 Total wasted space: 5.2 MB
```

---

### organize Command

Automatically organizes files into categories based on file extension.

**Usage:**

```bash
node file-organizer.js organize <directory> --output <path>
```

**Arguments:**

- `<directory>` - Path to directory with files to organize (required)

**Options:**

- `--output <path>` - Destination directory for organized files (required)

**File Categories:**

- **Documents** - .pdf, .docx, .doc, .txt, .md, .xlsx, .pptx
- **Images** - .png, .jpg, .jpeg, .gif, .svg, .webp, .bmp
- **Archives** - .zip, .rar, .tar, .gz, .7z
- **Code** - .js, .py, .java, .cpp, .html, .css, .json
- **Videos** - .mp4, .avi, .mkv, .mov, .webm
- **Other** - All other files

**Behavior:**

- Copies files (doesn't move/delete originals)
- Handles file name conflicts by appending numbers: `file(1).txt`, `file(2).txt`
- Creates destination directories automatically
- Handles large files (>10MB) with streaming for memory efficiency

**Examples:**

```bash
# Organize Downloads folder to Organized/
node file-organizer.js organize ~/Downloads --output ~/Organized/

# Organize current directory
node file-organizer.js organize . --output ./Organized/

# Organize to external drive
node file-organizer.js organize /home/user/files --output /mnt/external/organized/
```

**Sample Output:**

```
📦 Organizing: C:\Users\maxko\Downloads
Target: C:\Users\maxko\Organized

Copying files... ████████████████████ 126/126 files

✅ Organization complete!

Summary:
        Documents       12 files → C:\Users\maxko\Organized\Documents
        Images          45 files → C:\Users\maxko\Organized\Images
        Code            20 files → C:\Users\maxko\Organized\Code
        Archives         8 files → C:\Users\maxko\Organized\Archives
        Other           41 files → C:\Users\maxko\Organized\Other

Total copied: 126 (260.5 KB)
```

---

### cleanup Command

Identifies and safely removes files older than a specified number of days.

**Usage:**

```bash
# Dry run (preview files to be deleted)
node file-organizer.js cleanup <directory> --older-than <days>

# Actually delete files
node file-organizer.js cleanup <directory> --older-than <days> --confirm
```

**Arguments:**

- `<directory>` - Path to directory to clean (required)

**Options:**

- `--older-than <days>` - Minimum age in days (required)
  - Must be a non-negative integer (0 or greater)
  - Files older than this threshold will be marked for deletion
- `--confirm` - Actually delete files (optional)
  - Without this flag, runs in DRY RUN mode (preview only)
  - With this flag, permanently deletes files (cannot be undone)

**Behavior:**

- Shows preview of files to be deleted before confirming
- Files are sorted by age (oldest first)
- Displays file size and last modification date for each file
- Calculates total space that will be freed

**Examples:**

```bash
# Preview files older than 1 year (without deleting)
node file-organizer.js cleanup ~/Downloads --older-than 365

# Preview files older than 30 days
node file-organizer.js cleanup . --older-than 30

# Delete files older than 6 months (CAUTION!)
node file-organizer.js cleanup ~/Downloads --older-than 180 --confirm

# Delete files older than 1 year from temp directory
node file-organizer.js cleanup /tmp --older-than 365 --confirm
```

**Sample Output (Dry Run):**

```
🧹 Cleanup: C:\Users\maxko\Downloads

Looking for files older than 365 days...
Checking files... ████████████████████ 126/126 files

Found 15 files to delete:

══════════════════════════════════

old_backup.zip
        Size: 125.5 MB
        Modified: 512 days ago (2024-08-15)

forgotten_project.tar
        Size: 85.2 MB
        Modified: 489 days ago (2024-09-07)

ancient_file.doc
        Size: 2.3 MB
        Modified: 425 days ago (2024-11-10)

══════════════════════════════════
Total: 15 files (250.8 MB)

⚠️  DRY RUN MODE: No files were deleted.
```

**Sample Output (With --confirm):**

```
🧹 Cleanup: C:\Users\maxko\Downloads

Looking for files older than 365 days...
Checking files... ████████████████████ 126/126 files

Found 15 files to delete:

[... file list as above ...]

══════════════════════════════════
Total: 15 files (250.8 MB)

⚠️  DELETING 15 files (250.8 MB). This action cannot be undone!

Deleting... ████████████████████ 15/15 files

✅ Deletion complete!
Deleted: 15 files (250.8 MB freed)
```

---

## Error Handling

The application includes comprehensive error handling for common issues:

### Directory Errors

- **ENOENT** (Directory not found) - Clear message when path doesn't exist
- **EACCES** (Permission denied) - Message when lacking read/write permissions
- **Not a directory** - Helpful error when providing a file path instead of directory

### File Access Errors

- Gracefully skips files with permission issues and continues processing
- Warns about inaccessible files without stopping the operation
- Continues deletion attempts even if some files fail

### Input Validation Errors

- `--older-than` must be a non-negative integer
- Invalid values produce clear error messages with the invalid input shown

### Common Error Messages

```bash
# Directory not found
❌ Error: Directory not found: /invalid/path

# Permission denied
❌ Error: Permission denied: /root/protected

# Invalid --older-than value
error: option '--older-than <days>' argument invalid: --older-than must be a non-negative integer, got "abc"

# Warning for inaccessible files (continues processing)
⚠️  Warning: Permission denied: protected_file.txt
```

---

## Examples

### Workflow 1: Clean Up Old Downloads

```bash
# 1. Preview files older than 1 year
node file-organizer.js cleanup ~/Downloads --older-than 365

# 2. Review the list and confirm you want to delete
# 3. Delete files
node file-organizer.js cleanup ~/Downloads --older-than 365 --confirm
```

### Workflow 2: Organize and Find Duplicates

```bash
# 1. Organize current project files
node file-organizer.js organize . --output ./Organized/

# 2. Check for any duplicates in the organized result
node file-organizer.js duplicates ./Organized/

# 3. Review duplicates and manually remove unwanted copies
```

### Workflow 3: Analyze Directory and Archive Old Files

```bash
# 1. Get detailed statistics
node file-organizer.js scan ~/Documents

# 2. Find files older than 2 years
node file-organizer.js cleanup ~/Documents --older-than 730

# 3. Archive them to backup (using organize command)
node file-organizer.js organize ~/Documents --output ~/Archives/old_documents/

# 4. Delete after confirming backup
node file-organizer.js cleanup ~/Documents --older-than 730 --confirm
```

### Workflow 4: Storage Optimization

```bash
# 1. Check what's using disk space
node file-organizer.js scan /home/user

# 2. Find all duplicates
node file-organizer.js duplicates /home/user

# 3. Organize files by type for easier management
node file-organizer.js organize /home/user --output /home/user/Organized/

# 4. Remove duplicates manually after reviewing results
```

---

## Tips & Best Practices

1. **Always do a dry run first** - Use cleanup without `--confirm` to preview changes
2. **Back up before cleanup** - Use organize to create backups before deleting
3. **Use relative paths** - Easier to read and understand in output
4. **Check duplicates regularly** - Helps prevent storage bloat
5. **Monitor file ages** - Use scan command to understand your file distribution
6. **Test with small directories** - Verify behavior before running on large directories

---

## Notes

- This tool **copies** files (doesn't move them) in the organize command
- The **cleanup command with --confirm permanently deletes** files - use with caution
- Progress bars use ANSI escapes for overwriting lines in the terminal
- All operations skip directories automatically (files only)
- Relative paths are displayed in output for clarity

export default function drawProgressBar(current, total, width = 20) {
  const percentage = current / total;
  const filled = Math.floor(percentage * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `${bar} ${current}/${total} files`;
}

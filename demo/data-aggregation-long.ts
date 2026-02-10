/** Demo: Long aggregation function — extract helpers */
export function aggregateReport(data: number[][]) {
  let total = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  const sums: number[] = [];
  const avgs: number[] = [];
  for (const row of data) {
    const rowSum = row.reduce((a, b) => a + b, 0);
    total += rowSum;
    count += row.length;
    min = Math.min(min, ...row);
    max = Math.max(max, ...row);
    sums.push(rowSum);
    avgs.push(rowSum / row.length);
  }
  return { total, count, min, max, sums, avgs, overallAvg: total / count };
}

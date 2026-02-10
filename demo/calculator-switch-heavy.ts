/** Demo: Heavy switch — consider strategy map or polymorphism */
export function calculate(op: string, a: number, b: number): number {
  switch (op) {
    case 'add':
      return a + b;
    case 'sub':
      return a - b;
    case 'mul':
      return a * b;
    case 'div':
      return a / b;
    case 'mod':
      return a % b;
    case 'pow':
      return Math.pow(a, b);
    case 'min':
      return Math.min(a, b);
    case 'max':
      return Math.max(a, b);
    default:
      return 0;
  }
}

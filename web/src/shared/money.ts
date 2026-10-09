const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const money = (amount: number) => `৳${formatter.format(amount)}`;

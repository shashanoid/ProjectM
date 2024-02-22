export function formatLargeNumber(x) {
  if (!x) return 0;
  const parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts[1] && parts[1].length > 2) {
    parts[1] = parts[1].substring(0, 2);
  }
  return parts.join(".");
}

// new Date("2023-12-08").toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

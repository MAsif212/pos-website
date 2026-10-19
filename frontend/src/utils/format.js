export const formatRs = (n) =>
  "Rs " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

export const formatDate = (d) =>
  new Date(d).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
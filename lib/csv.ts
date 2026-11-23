export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}
export const PRODUCT_CSV_TEMPLATE = "name,sku,price,category,brand,inventory,image_url,status,description,tags\nCloudwalk Cushioned Sneakers,FW-1001,89,Footwear,Northpath,142,,active,Everyday sneakers,shoes comfortable walking\n";

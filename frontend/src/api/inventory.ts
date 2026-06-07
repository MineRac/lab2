export async function getInventory() {
  const res = await fetch("https://lab2-gamma-lovat.vercel.app/api/inventory");
  if (!res.ok) throw new Error("Failed to load inventory");
  return res.json();
}
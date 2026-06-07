export async function getInventory() {
  const res = await fetch("https://https://github.com/MineRac/lab2/tree/main/backend/api/inventory");

  if (!res.ok) {
    throw new Error("Failed to load inventory");
  }

  return res.json();
}
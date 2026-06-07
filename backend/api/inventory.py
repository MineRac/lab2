import { api } from "./client";

export const getInventory = async () => {
  const res = await api.get("/inventory");
  return res.data;
};

export const getProducts = async () => {
  const res = await api.get("/products");
  return res.data;
};

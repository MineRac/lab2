import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Создаём пользователя admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  // Создаём несколько товаров
  const products = [
    { sku: 'SKU-001', name: 'Ноутбук Dell XPS 15', category: 'Электроника', price: 125000, stock: 156, minStock: 50, maxStock: 200, location: 'A-12' },
    { sku: 'SKU-002', name: 'Монитор Samsung 27"', category: 'Электроника', price: 35000, stock: 89, minStock: 30, maxStock: 150, location: 'B-08' },
    { sku: 'SKU-003', name: 'Клавиатура Logitech MX', category: 'Периферия', price: 8500, stock: 234, minStock: 100, maxStock: 300, location: 'C-15' },
    { sku: 'SKU-004', name: 'Мышь Logitech G502', category: 'Периферия', price: 6500, stock: 45, minStock: 80, maxStock: 200, location: 'C-16' },
    { sku: 'SKU-005', name: 'Наушники Sony WH-1000XM5', category: 'Аудио', price: 28000, stock: 178, minStock: 60, maxStock: 250, location: 'D-04' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p,
    });
  }

  // Создаём правила автозаказа
  const allProducts = await prisma.product.findMany();
  for (const product of allProducts) {
    await prisma.autoOrder.upsert({
      where: { id: `rule-${product.id}` }, // не работает, лучше сделать поиск по productId
      update: {},
      create: {
        productId: product.id,
        triggerLevel: product.minStock,
        orderQuantity: product.maxStock - product.minStock,
        isActive: true,
      },
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
import { prisma } from '../../lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../lib/jwt';

export default async function handler(req: any, res: any) {
  // Убедимся, что метод POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    console.log('Login attempt:', email); // посмотрите в логах Vercel

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Проверим подключение к БД (чтобы убедиться, что Prisma работает)
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User found:', !!user);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);
    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: any) {
    console.error('Login error details:', err);
    // Возвращаем понятный JSON, а не HTML
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

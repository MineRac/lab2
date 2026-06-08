import { prisma } from '../../lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../lib/jwt';

export default async function handler(req: any, res: any) {
  // Убедимся, что только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user.id, user.role);
    return res.json({ token, user: { id: user.id, email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

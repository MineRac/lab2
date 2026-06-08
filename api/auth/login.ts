export default async function handler(req: any, res: any) {
  console.log('Login handler called', req.method);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { email, password } = req.body;
    // Просто возвращаем заглушку
    return res.status(200).json({ 
      token: 'test-token', 
      user: { id: '1', email, name: 'Test User', role: 'ADMIN' } 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

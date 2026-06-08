import 'dotenv/config';
import app from './app.js';

const port = Number(process.env.API_PORT ?? 4000);

app.get('/', (_req, res) => {
  res.type('html').send(`
    <main style="font-family: system-ui, sans-serif; max-width: 760px; margin: 48px auto; line-height: 1.5">
      <h1>Backend работает</h1>
      <p>Проверка API: <a href="/api/health">/api/health</a></p>
      <p>Frontend в разработке: <a href="http://localhost:5173">http://localhost:5173</a></p>
    </main>
  `);
});

app.listen(port, () => {
  console.log(`API server started: http://localhost:${port}`);
});

export default function handler(req: any, res: any) {
  console.log('Ping endpoint called');
  res.status(200).json({ message: 'pong', timestamp: Date.now() });
}

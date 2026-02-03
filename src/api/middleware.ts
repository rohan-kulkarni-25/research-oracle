import { Request, Response, NextFunction } from 'express';

const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    next();
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    return;
  }

  next();
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    next();
    return;
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter
    });
    return;
  }

  record.count++;
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('Error:', err.message);
  console.error(err.stack);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
}

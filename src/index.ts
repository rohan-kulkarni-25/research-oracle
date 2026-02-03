import { config } from 'dotenv';
config();

import express from 'express';
import routes from './api/routes';
import { authMiddleware, rateLimitMiddleware, errorHandler } from './api/middleware';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(rateLimitMiddleware);
app.use('/api/v1', authMiddleware, routes);
app.use(errorHandler);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Research Oracle listening on port ${PORT}`);
});

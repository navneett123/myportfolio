
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import ledgerRouter from './routes/ledger.js';
import insightsRouter from './routes/insights.js';
import investmentsRouter from './routes/investments.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/api/ledger', ledgerRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/investments', investmentsRouter);

app.use('/', express.static(path.join(__dirname, 'web')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MyPersonalPortfolio running at http://localhost:${PORT}`));

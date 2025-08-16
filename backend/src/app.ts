import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import countryRoutes from './routes/country.routes';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/countries', countryRoutes);

export default app;

import express from 'express';
import morgan from 'morgan';
import countryRoutes from './routes/country.routes';
import alignmentRoutes from './routes/alignment.routes';

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/countries', countryRoutes);
app.use('/api/alignment', alignmentRoutes);

export default app;

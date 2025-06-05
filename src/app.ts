import express from 'express';
import morgan from 'morgan';
import countryRoutes from './routes/country.routes';

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use('/api/countries', countryRoutes);

export default app;

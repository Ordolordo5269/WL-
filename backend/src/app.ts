import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import countryRoutes from './routes/country.routes';
import societyRoutes from './routes/society.routes';
import politicsRoutes from './routes/politics.routes';
import eventsRoutes from './routes/events';

const app = express();

app.use(morgan('dev'));
app.use(express.json());

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'], // Vite default port and backend ports
  credentials: true
}));

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Register routes
app.use('/api/countries', countryRoutes);
app.use('/api/society', societyRoutes);
app.use('/api/politics', politicsRoutes);
app.use('/api/events', eventsRoutes);

export default app;

import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import countryRoutes from './routes/country.routes';
import societyRoutes from './routes/society.routes';

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

export default app;

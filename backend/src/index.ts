import app from './app';
import { startEventStream } from './services/eventstreams';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Start Wikimedia EventStreams subscriber
startEventStream();

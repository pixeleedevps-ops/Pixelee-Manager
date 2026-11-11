import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] PIXELÉE MANAGER API escuchando en http://localhost:${config.port}/api/health`);
});

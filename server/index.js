import { app } from './app.js';
import { init, dbUrl } from './db.js';

const port = Number(process.env.PORT || 3000);
await init();
app.listen(port, () => console.log(`[psru-exam] http://localhost:${port}  (db: ${dbUrl.replace(/\?.*$/, '')})`));

import { createServer } from 'vite';

const app = process.argv[2];
if (!['admin', 'storefront'].includes(app)) throw new Error('Unknown test frontend');
const target = 'http://127.0.0.1:3302';
process.chdir('packages/' + app);
const server = await createServer({
  server: {
    host: '127.0.0.1', port: app === 'admin' ? 5273 : 5274, strictPort: true,
    proxy: { '/api': target, '/uploads': target, '/socket.io': { target, ws: true } },
  },
});
await server.listen();

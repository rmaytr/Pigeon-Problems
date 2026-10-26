import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{three:['three']}}}},server:{hmr:{port:Number(process.env.PORT||5173)+20000}}});

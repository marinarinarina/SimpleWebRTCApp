import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load environment variables from .env file
	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [react()],
		server: {
			port: parseInt(env.VITE_PORT, 10),
		},
	};
});

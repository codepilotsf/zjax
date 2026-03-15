// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    hmr: process.env.VITE_HMR !== 'false',
  },
  build: {
    lib: {
      entry: "src/main.js", // Your main library entry file
      name: "zjax", // The global variable name (e.g., window.zjax)
      fileName: () => 'zjax.min.js', // Output file name
      formats: ["iife"], // Output format: IIFE
    },
    rollupOptions: {
      output: {
        // Remove the "name" property if you don't need a global variable
        // globals: { // If you have external dependencies, define their global names
        //   'some-external-library': 'SomeExternalLibrary'
        // },
      },
    },
    minify: true,
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "test-404",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Check if the current path should be a 404
          if (req.url === "/test-404") {
            res.statusCode = 404;
            res.end("Not Found");
            return;
          }
          next();
        });
      },
    },
    {
      name: "test-401",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Check if the current path should be a 404
          if (req.url === "/test-401") {
            res.statusCode = 401;
            res.end("Unauthorized");
            return;
          }
          next();
        });
      },
    },
    {
      name: "test-500",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Check if the current path should be a 404
          if (req.url === "/test-500") {
            res.statusCode = 500;
            res.end("Internal Server Error");
            return;
          }
          next();
        });
      },
    },
    {
      name: 'echo',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/echo')) {
            let reqBody = '';
            for await (const chunk of req) { reqBody += chunk; }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(`
              <pre>${req.method} ${req.url} ${reqBody}</pre>
            `);
            return;
          }
          next();
        });
      },
    },
  ],
});

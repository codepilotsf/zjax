import fs from "fs/promises";
import path from "path";

import express from "express";
import { JSDOM } from "jsdom";
import multer from "multer";
import { createServer as createViteServer } from "vite";

const upload = multer(); // to handle multipart/form-data

async function startServer() {
  const app = express();

  // Routes
  app.get("/submit", upload.none(), (req, res) => {
    console.log("req.query.name", req.query.name);
    res.type("html");
    res.send("<form>WORKED WITH GET</form>");
  });

  app.post("/submit", upload.none(), (req, res) => {
    console.log("req.body.name", req.body.name);
    res.type("html");
    res.send("<form>WORKED WITH POST</form>");
  });

  app.get('/', async (req, res) => {
    const testOutDirectory = 'test/out';
    const absolutePath = path.join(import.meta.dirname, testOutDirectory);
    const files = (await fs.readdir(absolutePath, { withFileTypes: true }))
      .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
      .sort((a, b) => a.name.localeCompare(b.name));

    const iframes = await Promise.all(
      files.map(async (file) => {
        const fileContent = await fs.readFile(path.join(absolutePath, file.name));
        const title = new JSDOM(fileContent).window.document.querySelector('title')?.textContent || file.name;
        return `
          <section style="margin: 0; padding: 0 0 25px; border-bottom-color: var(--accent); font-size: 1rem;">
            <a href="test/out/${file.name}">${title}</a>
            <iframe  src="/${testOutDirectory}/${file.name}" scrolling="no"
              style="width:100%; height:0; border:none; transition: height 0.2s ease;">
            </iframe>
          </section>
        `;
      })
    );

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="test/assets/simple.min.css"/>
      </head>
      <body>
        ${iframes.join('')}
        <script>
          document.querySelectorAll('iframe').forEach(iframe => {
            iframe.addEventListener('load', () => {
              const doc = iframe.contentWindow.document;
              const updateHeight = () => {
                iframe.style.height = doc.documentElement.scrollHeight + 'px';
              };
              updateHeight();
              new ResizeObserver(updateHeight).observe(doc.body);
            });
          });
        </script>
      </body>
      </html>
    `);
  });

  // Create Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
  });

  // Use Vite's middleware to serve front-end files
  app.use(vite.middlewares);

  app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
  });
}

startServer();

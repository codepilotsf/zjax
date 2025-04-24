import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const upload = multer(); // to handle multipart/form-data

async function startServer() {
  const app = express();

  // Routes
  app.get("/submit", upload.none(), (req, res) => {
    console.log("req.query", req.query);
    res.type("html");
    res.send("<form>WORKED WITH GET</form>");
  });

  app.post("/submit", upload.none(), (req, res) => {
    console.log("req.body", req.body);
    res.type("html");
    res.send("<form>WORKED WITH POST</form>");
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

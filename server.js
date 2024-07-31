import http from "http";
import app from "./app.js";

// //REMEMBER TO DELETE WHEN DONE TESTING////////////////////////////
// import { initializePosts } from "./app.js";                   ///
// initializePosts(); // Initialize posts when the server starts ///
// ////////////////////////////////////////////////////////////////
const port = 8080;

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

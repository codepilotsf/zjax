import * as zswaps from "./zswaps.js";
import { zjax } from "./zjax.js";
import { debug } from "./debug.js";

// Create a global zjax object for setting config, and registering JS ations.
window.zjax = zjax;

// Parse the DOM on load.
addEventListener("DOMContentLoaded", function () {
  debug("Parsing DOM");
  zswaps.parseZSwaps(document);
});

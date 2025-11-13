import { parseSwaps, parseActions } from "../lib";

export function getGlobal() {
  return {
    debug: false,
    transitions: true,
    actions: {},
    errors: {},
    parse: function (documentOrNode = document) {
      // Parse the DOM for zjax elements
      parseSwaps(documentOrNode);
      parseActions(documentOrNode);
    },
  };
}

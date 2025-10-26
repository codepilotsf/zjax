import { parseSwaps, parseActions } from "../lib";

export function getGlobal() {
  return {
    debug: false,
    transitions: true,
    actions: {},
    errors: {},
    parse: function (documentOrNode) {
      // Parse the DOM for zjax elements
      documentOrNode = documentOrNode || document;
      parseSwaps(documentOrNode);
      parseActions(documentOrNode);
    },
  };
}

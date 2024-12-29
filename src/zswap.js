import * as constants from "./constants.js";
import { zjax } from "./zjax.js";
import { debug } from "./debug.js";

export async function parseZSwaps(documentOrNode) {
  const zSwapNodes = getMatchingNodes(documentOrNode, "[z-swap]");
  debug(
    `Found ${zSwapNodes.length} z-swap nodes in ${prettyNodeName(
      documentOrNode
    )}`
  );

  for (const node of zSwapNodes) {
    try {
      // Get the z-swap attribute and parse value into zSwapObject
      const zSwapString = node.getAttribute("z-swap");
      const zSwapObject = getZSwapObject(zSwapString, node);
      // Add the swap function listener to the node
      const zSwapFunction = getZSwapFunction(zSwapObject, node);
      attachEventListener(zSwapObject.trigger, zSwapFunction, node);
      // Add a mutation observer to remove the event listener when the node is removed
      attachMutationObserver(zSwapObject.trigger, zSwapFunction, node);
      if (zSwapObject.trigger === "load") {
        node.dispatchEvent(new Event("load"));
      }

      debug(
        `Added z-swap for '${zSwapObject.trigger}' events to ${prettyNodeName(
          node
        )}`
      );
    } catch (error) {
      console.error(
        `ZJAX ERROR – Unable to parse z-swap: ${error.message}\n`,
        node,
        error.stack
      );
    }
  }
}

export function getZSwapObject(zSwapString, node) {
  const valueString = collapseCommas(zSwapString);
  // Split on whitespace
  const valueParts = valueString.split(/\s/);
  if (valueParts.length < 1 || valueParts.length > 4) {
    throw new Error("Must have between 1 and 4 parts separated by spaces.");
  }

  // Loop through space-separated parts of the z-swap attribute to build the zSwapObject object
  const zSwapObject = {};
  const leftoverParts = [];

  while (valueParts.length > 0) {
    const part = valueParts.shift();
    const typeAndValue = getTriggerMethodOrEndpointPair(part);
    if (typeAndValue) {
      zSwapObject[typeAndValue[0]] = typeAndValue[1];
    } else {
      leftoverParts.push(part);
    }
  }

  // Special case: @submit trigger is only available on <FORM> elements
  if (zSwapObject.trigger === "@submit" && node.tagName !== "FORM") {
    throw new Error("@submit trigger is only available on <FORM> elements");
  }
  // Add the array of swaps
  zSwapObject.swaps = getSwaps(leftoverParts.join(" "));

  // Now set defaults for missing values.
  if (!zSwapObject.trigger) {
    zSwapObject.trigger = node.tagName === "FORM" ? "submit" : "click";
  }
  if (!zSwapObject.method) {
    zSwapObject.method = node.tagName === "FORM" ? "POST" : "GET";
  }
  if (!zSwapObject.endpoint) {
    if (node.tagName === "FORM") {
      zSwapObject.endpoint = node.action;
    } else if (node.tagName === "A") {
      zSwapObject.endpoint = node.href;
    } else {
      throw new Error("No endpoint inferrable or specified");
    }
  }
  return zSwapObject;
}

export function getTriggerMethodOrEndpointPair(swapSpecifier) {
  // Is this a Trigger?
  if (swapSpecifier.startsWith("@")) {
    return ["trigger", swapSpecifier.substr(1)];
  }
  // Is this an HTTP Method?
  if (constants.httpMethods.includes(swapSpecifier.toUpperCase())) {
    return ["method", swapSpecifier.toUpperCase()];
  }
  // Is this an Endpoint?
  //...is a ".", or starts with "/", "./", "http://", or "https://"
  const regexEndpoint = /^(\/.*|\.\/.*|https?:\/\/.*|\.)$/;
  if (regexEndpoint.test(swapSpecifier)) {
    return ["endpoint", swapSpecifier];
  }
}

export function prettyNodeName(documentOrNode) {
  return documentOrNode instanceof Document
    ? "#document"
    : "<" +
        documentOrNode.tagName.toLowerCase() +
        (documentOrNode.id ? "#" + documentOrNode.id : "") +
        ">";
}

export function getMatchingNodes(documentOrNode, selector) {
  // Find all decendent nodes with a z-swap attribute
  const nodesToParse = [];
  nodesToParse.push(...documentOrNode.querySelectorAll(selector));
  const isDocument = documentOrNode instanceof Document;
  if (!isDocument && documentOrNode.matches(selector)) {
    // And include the node itself if it has a z-swap attribute
    nodesToParse.push(documentOrNode);
  }
  return nodesToParse;
}

export function getSwaps(zSwapString) {
  // Parse a  like: "foo|inner->#bar|inner, #baz" into an array of objects
  // [
  //   { response: "foo", target: "#bar", responseType: "inner", swapType: "inner" },
  //   { response: "#baz", target: "#baz", responseType: "outer", swapType: "outer" }
  // ]
  const swaps = [];
  zSwapString.split(",").forEach(function (zSwapPart) {
    const swap = {};
    const responseAndTargetSwaps = zSwapPart.split("->") || [];
    const targetNodeAndSwapType = responseAndTargetSwaps.pop();
    const [targetNode, swapType] = targetNodeAndSwapType.split("|");
    const responseNodeAndResponseType = responseAndTargetSwaps[0] || "";
    const [responseNode, responseType] =
      responseNodeAndResponseType && responseNodeAndResponseType.split("|");
    swap["response"] = responseNode || targetNode;
    swap["target"] = targetNode;
    swap["responseType"] = (responseType && responseType.trim()) || "outer";
    swap["swapType"] = (swapType && swapType.trim()) || "outer";
    // Only allow valid Response Types
    if (
      swap["responseType"] &&
      !constants.responseTypes.includes(swap["responseType"])
    ) {
      throw new Error(`Invalid swap type: ${swap["responseType"]}`);
    }
    // Only allow valid Swap Types
    if (swap["swapType"] && !constants.swapTypes.includes(swap["swapType"])) {
      throw new Error(`Invalid swap type: ${swap["swapType"]}`);
    }
    // Special case: Disallow wild cards with swap/response types
    if (swap["response"] === "*" && swap["responseType"] !== "outer") {
      throw new Error('Wild card "*" can notbe piped to a Response Type');
    }
    if (swap["target"] === "*" && swap["swapType"] !== "outer") {
      throw new Error('Wild card "*" can not be piped to a Swap Type');
    }
    swaps.push(swap);
  });
  return swaps;
}

export function getZSwapFunction(zSwap, node) {
  return async function (event) {
    event.preventDefault();
    event.stopPropagation();
    debug("z-swap triggered for", zSwap);
    // Call the action
    try {
      const responseDOM = await getResponseDOM(zSwap.method, zSwap.endpoint);
      // Swap nodes
      zSwap.swaps.forEach(function (swap) {
        // Get the source and target nodes
        const [responseNode, targetNode] = getResponseAndTargetNodes(
          responseDOM,
          swap
        );
        // Before swapping in a response node, parse it for z-swaps
        debug(`Parsing incoming response for z-swaps`);
        if (responseNode) {
          // Tricky! You might have a z-swap="#not-in-response|delete"
          // so then there's nothing to parse in the response.
          parseZSwaps(responseNode);
        }
        // Swap the node using a view transition?
        if (constants.isVTSupported && zjax.transitions) {
          document.startViewTransition(() => {
            swapOneNode(
              targetNode,
              responseNode,
              swap.swapType,
              swap.responseType
            );
          });
        } else {
          swapOneNode(
            targetNode,
            responseNode,
            swap.swapType,
            swap.responseType
          );
        }
      });
    } catch (error) {
      console.error(
        `ZJAX ERROR – Unable to execute z-swap function: ${error.message}\n`,
        node,
        error.stack
      );
    }
  };
}

export async function getResponseDOM(method, endpoint) {
  // Get formData?
  // const body = ?? # TODO
  const response = await fetch(endpoint, {
    method: method,
    body: null,
  });
  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} for ${endpoint}`
    );
    // Todo: Think of some way to let the developer handle
    // this error to show a message to the useras an alert
    // notice. Maybe just trigger a zjax-error event?
  }
  const responseDOM = new DOMParser().parseFromString(
    await response.text(),
    "text/html"
  );
  debug(`z-swap response from ${endpoint} received and parsed`);
  return responseDOM;
}

export function getResponseAndTargetNodes(responseDOM, swap) {
  let targetNode;
  let responseNode;

  if (swap.target === "*") {
    // It isn't possible to use JS to replace the entire document
    // so we'll treat '*' as an alias for 'body'
    targetNode = document.querySelector("body");
    if (!targetNode) {
      throw new Error("Unable to find body element in local DOM to swap into");
    }
  } else {
    targetNode = document.querySelector(swap.target);
  }

  responseNode =
    swap.response === "*"
      ? responseDOM
      : responseDOM.querySelector(swap.response);

  // Make sure there's a valid target node for all swap types except "none"
  if (!targetNode && swap.swapType !== "none") {
    throw new Error(`Target node '${swap.target}' does not exist in local DOM`);
  }

  // Make sure there's a valid response node for all swap types except "none" or "delete"
  if (!responseNode && swap.swapType !== "none" && swap.swapType !== "delete") {
    throw new Error(
      `Source node ${swap.response} does not exist in response DOM`
    );
  }

  return [responseNode, targetNode];
}

export function swapOneNode(targetNode, responseNode, swapType, responseType) {
  console.log("got here");

  // If responseType is "inner", get the childNodes
  responseNode =
    responseType === "inner" ? responseNode.childNodes : responseNode;
  // // For class settling (in order to trigger css transitions), change attributes of
  // // any node with an id matching both target and response to start with attributes
  // // of the targetNode, then swap them later.
  // const attrsForIds = getAttrsForIds(targetNode, responseNode);

  // // First, overwrite attributes for the responseNode with attributes from the targetNode
  // // for everything except id and z-<attributes>.

  // NEW APPROACH
  const { interimResponseNode, attributesMap } = processAttributes(
    targetNode,
    responsNode
  );

  // TODO
  console.log("responseNode", responseNode);
  // console.log("attrsForIds", attrsForIds);

  // Since a responseNode might be a single node or a whole document (which may just contain
  // a handful of nodes), let's just normalize all responseNodes to be an array.
  const responseNodes = normalizeNodeList(responseNode);

  // Outer
  if (swapType === "outer") {
    const targetNodeParent = targetNode.parentNode;
    responseNodes.forEach((item) => {
      targetNodeParent.insertBefore(item, targetNode);
    });
    targetNodeParent.removeChild(targetNode);
    return;
  }

  // Inner
  if (swapType === "inner") {
    targetNode.textContent = "";
    responseNodes.forEach((item) => {
      targetNode.appendChild(item);
    });
    return;
  }

  // Before
  if (swapType === "before") {
    responseNodes.forEach((item) => {
      targetNode.parentNode.insertBefore(item, targetNode);
    });
    return;
  }

  // After
  if (swapType === "after") {
    const parentNode = targetNode.parentNode;
    referenceNodeToAppendTo = targetNode;
    responseNodes.forEach((item) => {
      if (item === parentNode.lastChild) {
        parentNode.appendChild(item);
      } else {
        parentNode.insertBefore(item, referenceNodeToAppendTo.nextSibling); // Otherwise, insert after the reference node
      }
      referenceNodeToAppendTo = item;
    });
    return;
  }

  // Prepend
  if (swapType === "prepend") {
    const firstChild = targetNode.firstChild;
    responseNodes.forEach((item) => {
      if (firstChild) {
        targetNode.insertBefore(item, firstChild);
      } else {
        targetNode.appendChild(item);
      }
    });
    return;
  }

  // Append
  if (swapType === "append") {
    responseNodes.forEach((item) => {
      targetNode.appendChild(item);
    });
    return;
  }

  // Delete
  if (swapType === "delete") {
    targetNode.remove();
    return;
  }

  // None
  if (swapType === "none") {
    return;
  }
}

export function getAttrsForIds(targetNode, responseNode) {
  // Example:
  // [
  //   {
  //     id: "foo",
  //     targetAttrs: [ class="bar", href="baz" ]
  //     responseAttrs: [ class="baz something-new", href="baz" ]
  //   }
  // ]

  const attrsForIds = [];

  if (targetNode.id) {
    // Check top level node itself.
    if (targetNode.id === responseNode.id) {
      attrsForIds.push({
        id: targetNode.id,
        targetAttrs: getAttributes(targetNode),
        responseAttrs: getAttributes(responseNode),
      });
    }

    // Now loop through all other inner nodes with an id
    for (const nodeWithId of targetNode.querySelectorAll("[id]")) {
      const matchingIdInResponse = responseNode.getElementById(nodeWithId.id);
      if (matchingIdInResponse) {
        attrsForIds.push({
          id: nodeWithId.id,
          targetAttrs: getAttributes(nodeWithId),
          responseAttrs: getAttributes(matchingIdInResponse),
        });
      }
    }
  }
  return attrsForIds;
}

export function getAttributes(node) {
  const attributes = [];
  for (const attribute of Array.from(node.attributes).filter(
    (attr) => !attrsToNotFreeze.includes(attr.name)
  )) {
    attributes.push([attribute.name, attribute.value]);
  }
  return attributes;
}

export function normalizeNodeList(node) {
  // Is the reponse a full HTML document?
  if (node instanceof Document) {
    // Is there an HTML element in the document?
    const htmlNode = node.querySelector("html");
    if (htmlNode) {
      return Array.from(htmlNode.childNodes);
    }
    // Otherwise, create a document fragment and return all child nodes
    const fragment = document.createDocumentFragment();
    for (const child of node.childNodes) {
      fragment.appendChild(child);
    }
    return Array.from(fragment.childNodes);
  }

  // Is the response a NodeList?
  if (node instanceof NodeList || Array.isArray(node)) {
    return Array.from(node);
  }

  // For a single node, just return as an array
  return [node];
}

export function attachEventListener(trigger, handler, node) {
  node.addEventListener(trigger, handler);
}

export function attachMutationObserver(trigger, handler, node) {
  // Create a MutationObserver to watch for node removal
  // When the node is removed, remove the event listener
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === node || removedNode.contains(node)) {
          // Remove event listener when the node is removed from DOM
          node.removeEventListener(trigger, handler);
          zjax.debug &&
            debug(
              `Removing event listener for ${prettyNodeName(
                node
              )} (no longer in DOM)`
            );
          observer.disconnect(); // Stop observing
          return;
        }
      }
    }
  });

  // Observe the parent of the target node for childList changes
  observer.observe(document.body, { childList: true, subtree: true });
}

export function collapseCommas(str) {
  // If commas have spaces next to them, remove those spaces.
  return str.replace(/\s*,\s*/g, ",");
}
import { constants, debug, utils, parseTriggers, parseActions, addZjaxListener } from "../lib";

export async function parseSwaps(documentOrNode) {
  // Find all nodes with a z-swap attribute
  const swapNodes = utils.getMatchingNodes(documentOrNode, "[z-swap]");
  debug(`Found ${swapNodes.length} z-swap nodes in ${utils.prettyNodeName(documentOrNode)}`);

  for (const node of swapNodes) {
    try {
      const value = node.getAttribute("z-swap");
      const triggers = parseTriggers(value, node);

      for (const trigger of triggers) {
        const swapObject = parseSwapObject(trigger);
        // Add the swap function listener to the node
        const handlerFunction = getSwapFunction(trigger, swapObject);

        addZjaxListener(trigger, handlerFunction);

        debug(`Added z-swap for '${trigger.event}' events to ${utils.prettyNodeName(node)}`);
      }
    } catch (error) {
      console.error(`ZJAX ERROR – Unable to parse z-swap: ${error.message}\n`, node, error.stack);
    }
  }
}

function parseSwapObject({ handlerString, node }) {
  handlerString = collapseCommas(handlerString);

  // Split on whitespace
  const handlerParts = handlerString.split(/\s/);
  if (handlerParts.length < 1 || handlerParts.length > 4) {
    throw new Error("Must have between 1 and 4 parts separated by spaces.");
  }

  // Loop through space-separated parts of the z-swap attribute to build the swapObject object
  const swapObject = {};
  const leftoverParts = [];

  while (handlerParts.length > 0) {
    const part = handlerParts.shift();
    const typeAndValue = getMethodOrEndpointPair(part);
    if (typeAndValue) {
      swapObject[typeAndValue[0]] = typeAndValue[1];
    } else {
      leftoverParts.push(part);
    }
  }

  // Add the array of swaps
  swapObject.swaps = getSwaps(leftoverParts.join(" "));

  // Now set defaults for missing values
  if (!swapObject.method) {
    swapObject.method = node.tagName === "FORM" ? "POST" : "GET";
  }
  if (!swapObject.endpoint) {
    if (node.tagName === "FORM") {
      swapObject.endpoint = node.action;
    } else if (node.tagName === "A") {
      swapObject.endpoint = node.href;
    } else {
      throw new Error("No endpoint inferrable or specified");
    }
  }

  return swapObject;
}

function getMethodOrEndpointPair(swapSpecifier) {
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

function getSwaps(swapString) {
  // Parse a string like: "foo|inner->#bar|inner, #baz" into an array of objects
  // [
  //   { response: "foo", target: "#bar", responseType: "inner", swapType: "inner" },
  //   { response: "#baz", target: "#baz", responseType: "outer", swapType: "outer" }
  // ]
  const swaps = [];
  for (const swapPart of swapString.split(",")) {
    const swap = {};
    const responseAndTargetSwaps = swapPart.split("->") || [];
    const targetNodeAndSwapType = responseAndTargetSwaps.pop();
    const [targetNode, swapType] = targetNodeAndSwapType.split("|");
    const responseNodeAndResponseType = responseAndTargetSwaps[0] || "";
    const [responseNode, responseType] = responseNodeAndResponseType?.split("|") || [null, null];
    swap.response = responseNode || targetNode;
    swap.target = targetNode;
    swap.responseType = responseType?.trim() || "outer";
    swap.swapType = swapType?.trim() || "outer";
    // Only allow valid Response Types
    if (swap.responseType && !constants.responseTypes.includes(swap.responseType)) {
      throw new Error(`Invalid swap type: ${swap.responseType}`);
    }
    // Only allow valid Swap Types
    if (swap.swapType && !constants.swapTypes.includes(swap.swapType)) {
      throw new Error(`Invalid swap type: ${swap.swapType}`);
    }
    // Special case: Disallow wild cards with swap/response types
    if (swap.response === "*" && swap.responseType !== "outer") {
      throw new Error('Wild card "*" can not be piped to a Response Type');
    }
    if (swap.target === "*" && swap.swapType !== "outer") {
      throw new Error('Wild card "*" can not be piped to a Swap Type');
    }
    swaps.push(swap);
  }
  return swaps;
}

function getSwapFunction(trigger, swapObject) {
  return async (event) => {
    // Add formData to swapObject now at swap time (so form values are populated)
    const formData = (trigger.node.tagName === "FORM" && new FormData(event.target)) || null;
    swapObject.formData = formData ? convertFormDataToString(formData) : null;
    debug("z-swap triggered for", swapObject);

    try {
      // Emit event
      const requestEvent = new CustomEvent("zjax:request", {
        detail: {
          event: trigger.event,
          node: trigger.node,
          method: swapObject.method,
          endpoint: swapObject.endpoint,
          formData: swapObject.formData,
        },
      });
      document.dispatchEvent(requestEvent);

      // Call the action
      const responseDOM = await getResponseDOM(
        swapObject.method,
        swapObject.endpoint,
        swapObject.formData,
      );

      const responseDOMToLog = responseDOM.body || responseDOM.documentElement;
      const responseEvent = new CustomEvent("zjax:response", {
        detail: {
          node: trigger.node,
          response: responseDOMToLog.innerHTML.replace(/\n|\s{2,}/g, ""),
        },
      });
      document.dispatchEvent(responseEvent);
      // Swap nodes
      for (const swap of swapObject.swaps) {
        const swappingEl = document.querySelector(swap.target);
        if (swappingEl) {
          swappingEl.classList.add("zjax-swapping");
        }
        // Get the source and target nodes
        const [responseNode, targetNode] = getResponseAndTargetNodes(responseDOM, swap);
        // Before swapping in a response node, parse it for z-swaps
        debug("Parsing incoming response for z-swaps");
        if (responseNode) {
          // Tricky! You might have a z-swap="#not-in-response|delete"
          // so then there's nothing to parse in the response.
          parseSwaps(responseNode);
          parseActions(responseNode);
        }
        // Swap the node using a view transition?
        if (constants.isVTSupported && zjax.transitions) {
          document.startViewTransition(() => {
            swapOneNode(targetNode, responseNode, swap.swapType, swap.responseType);
          });
        } else {
          swapOneNode(targetNode, responseNode, swap.swapType, swap.responseType);
        }
      }

      const swapEvent = new CustomEvent("zjax:swap", {
        detail: {
          node: trigger.node,
          swaps: swapObject.swaps,
        },
      });
      document.dispatchEvent(swapEvent);
    } catch (error) {
      console.error(
        `ZJAX ERROR – Unable to execute z-swap function: ${error.message}\n`,
        trigger.node,
        error.stack,
      );
    }
  };
}

async function getResponseDOM(method, endpoint, formData) {
  const response = await fetch(endpoint, {
    method: method,
    body: formData || null,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${endpoint}`);
    // Todo: Think of some way to let the developer handle
    // this error to show a message to the useras an alert
    // notice. Maybe just trigger a zjax-error event?
  }
  const responseDOM = new DOMParser().parseFromString(await response.text(), "text/html");
  debug(`z-swap response from ${endpoint} received and parsed`);
  return responseDOM;
}

function getResponseAndTargetNodes(responseDOM, swap) {
  let targetNode;

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

  const responseNode =
    swap.response === "*" ? responseDOM : responseDOM.querySelector(swap.response);

  // Make sure there's a valid target node for all swap types except "none"
  if (!targetNode && swap.swapType !== "none") {
    throw new Error(`Target node '${swap.target}' does not exist in local DOM`);
  }

  // Make sure there's a valid response node for all swap types except "none" or "delete"
  if (!responseNode && swap.swapType !== "none" && swap.swapType !== "delete") {
    throw new Error(`Source node ${swap.response} does not exist in response DOM`);
  }

  return [responseNode, targetNode];
}

function getMutatedResponseNodeAndAttributesToUpdateMap(targetNode, responseNode) {
  // Return the mutated responseNode and an attributesToUpdate object for later use.
  // The mutated responseNode retains most attributes from the targetNode for any
  // nodes with an id matching both target and response.
  const attributesToUpdateMap = {};

  // First, check the parent node for an id present in both the target and
  // response.
  const targetNodesWithIds = querySelectorAllIncludingParent(targetNode, "[id]");

  for (const targetNodeWithId of targetNodesWithIds) {
    const responseNodeWithMatchingId = querySelectorIncludingParent(
      responseNode,
      `[id="${targetNodeWithId.id}"]`,
    );
    if (responseNodeWithMatchingId) {
      const attributesToRetain = getAttributes(targetNodeWithId);
      const attributesToUpdate = getAttributes(responseNode);
      removeAttributes(responseNode);
      setAttributes(responseNode, attributesToRetain);
      attributesToUpdateMap[targetNodeWithId.id] = attributesToUpdate;
    }
  }

  return [responseNode, attributesToUpdateMap];
}

function swapOneNode(targetNode, responseNode, swapType, responseType) {
  // If responseType is "inner", get the childNodes
  responseNode = responseType === "inner" ? responseNode.childNodes : responseNode;

  // Get the mutated responseNode and attributesToUpdateMap for later use.
  let attributesToUpdateMap;
  [responseNode, attributesToUpdateMap] = getMutatedResponseNodeAndAttributesToUpdateMap(
    targetNode,
    responseNode,
  );

  // Since a responseNode might be a single node or a whole document (which may just contain
  // a handful of nodes), let's just normalize all responseNodes to be an array.
  const responseNodes = normalizeNodeList(responseNode);

  // Outer
  if (swapType === "outer") {
    const targetNodeParent = targetNode.parentNode;
    for (const item of responseNodes) {
      targetNodeParent.insertBefore(item, targetNode);
    }
    targetNodeParent.removeChild(targetNode);
    updateAttributes(responseNode, attributesToUpdateMap);
    return;
  }

  // Inner
  if (swapType === "inner") {
    targetNode.textContent = "";
    for (const item of responseNodes) {
      targetNode.appendChild(item);
    }
    updateAttributes(responseNode, attributesToUpdateMap);
    return;
  }

  // Before
  if (swapType === "before") {
    for (const item of responseNodes) {
      targetNode.parentNode.insertBefore(item, targetNode);
    }
    updateAttributes(responseNode, attributesToUpdateMap);
    return;
  }

  // After
  if (swapType === "after") {
    const parentNode = targetNode.parentNode;
    let referenceNodeToAppendTo = targetNode;
    for (const item of responseNodes) {
      if (item === parentNode.lastChild) {
        parentNode.appendChild(item);
      } else {
        parentNode.insertBefore(item, referenceNodeToAppendTo.nextSibling); // Otherwise, insert after the reference node
      }
      referenceNodeToAppendTo = item;
    }
    updateAttributes(responseNode, attributesToUpdateMap);
    return;
  }

  // Prepend
  if (swapType === "prepend") {
    const firstChild = targetNode.firstChild;

    for (const item of responseNodes) {
      if (firstChild) {
        targetNode.insertBefore(item, firstChild);
      } else {
        targetNode.appendChild(item);
      }
    }
    updateAttributes(responseNode, attributesToUpdateMap);
    return;
  }

  // Append
  if (swapType === "append") {
    for (const item of responseNodes) {
      targetNode.appendChild(item);
    }
    updateAttributes(responseNode, attributesToUpdateMap);
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

function querySelectorIncludingParent(node, selector) {
  if (node.matches(selector)) {
    return node;
  }

  return node.querySelector(selector);
}

function querySelectorAllIncludingParent(node, selector) {
  const matches = [];

  if (node.matches(selector)) {
    matches.push(node);
  }

  matches.push(...node.querySelectorAll(selector));
  return matches;
}

function getAttributes(node) {
  const attributes = [];
  for (const attribute of Array.from(node.attributes).filter(
    (attr) => !constants.attrsToNotFreeze.includes(attr.name),
  )) {
    attributes.push([attribute.name, attribute.value]);
  }
  return attributes;
}

function setAttributes(node, attributes) {
  for (const [name, value] of attributes) {
    node.setAttribute(name, value);
  }
}

function removeAttributes(node) {
  // Iterate through all attributes of the node
  for (const attr of Array.from(node.attributes)) {
    // If the attribute is not in the allowed list, remove it
    if (!constants.attrsToNotFreeze.includes(attr.name)) {
      node.removeAttribute(attr.name);
    }
  }
}

async function updateAttributes(outerNode, attributesToUpdateMap) {
  setTimeout(() => {
    for (const [id, attributes] of Object.entries(attributesToUpdateMap)) {
      const nodeWithId = querySelectorIncludingParent(outerNode, `[id="${id}"]`);
      if (nodeWithId) {
        removeAttributes(nodeWithId);
        setAttributes(nodeWithId, attributes);
      }
    }

    const updatedElements = Object.keys(attributesToUpdateMap)
      .map((id) => `#${id}`)
      .join(", ");
    if (updatedElements) {
      const settleEvent = new CustomEvent("zjax:settle", {
        detail: {
          node: outerNode,
          elementIds: updatedElements,
        },
      });
      document.dispatchEvent(settleEvent);
    }
  }, 20);
}

function normalizeNodeList(node) {
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

function collapseCommas(str) {
  // If commas have spaces next to them, remove those spaces.
  return str.replace(/\s*,\s*/g, ",");
}

function convertFormDataToString(formData) {
  const urlEncodedData = new URLSearchParams();
  for (const [key, value] of formData.entries()) {
    urlEncodedData.append(key, value);
  }
  return urlEncodedData.toString();
}

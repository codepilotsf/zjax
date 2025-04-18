import { debug, getDollar, utils, parseTriggers, addZjaxListener } from "../lib";

export function parseActions(documentOrNode) {
  // Find all nodes with z-action attributes.
  const zActionNodes = utils.getMatchingNodes(documentOrNode, "[z-action]");
  debug(`Found ${zActionNodes.length} z-action nodes in ${utils.prettyNodeName(documentOrNode)}`);

  // For each node, get an array of trigger objects
  for (const node of zActionNodes) {
    try {
      const value = node.getAttribute("z-action");
      const triggers = parseTriggers(value, node);
      // For each trigger, get the handler function and add the listener
      for (const trigger of triggers) {
        // const handlerFunction = getActionFunction(trigger);
        // node.handlerId = addZjaxListener(trigger, handlerFunction, true);

        const wrapperFunction = getWrapperFunction(trigger);
        node.handlerId = addZjaxListener(trigger, wrapperFunction, true);

        debug(`Added z-action for '${trigger.event}' events to ${utils.prettyNodeName(node)}`);
      }
    } catch (error) {
      console.error(`ZJAX ERROR – Unable to parse z-action: ${error.message}\n`, node, error.stack);
    }
  }
}

function getWrapperFunction(trigger) {
  // In order to avoid race conditions, we need to look for declared actions at runtime. So rather
  // than trying to find the action handlerFunction and attaching that to the listener, we'll
  // instead attach a function to go find and build that function from the trigger object at
  // runtime. So when the button is "clicked" for example, at _that_ time, we'll find or create
  // the handler function.

  return async function (event) {
    const handlerFunction = getActionFunction(trigger);
    await handlerFunction(event);
  };
}

function getActionFunction({ handlerString }) {
  // Does the function text look like a function name possibly namespaced?
  const actionNameMatch = handlerString.match(/^(?:(\w+)\.)?(\w+)$/);

  // If so, try to find the action function on the zjax.userActions object.
  if (actionNameMatch) {
    const nameSpace = actionNameMatch[1];
    const actionName = actionNameMatch[2];
    const actions = zjax && zjax.userActions;

    // Try to find the action function with namespace.
    if (nameSpace) {
      if (!(actions[nameSpace] && actions[nameSpace][actionName])) {
        throw new Error(`Unknown action: ${nameSpace}.${actionName}`);
      }
      // Note that the handler needs to be `bind`ed to the namespace object
      // in order to preserve the `this` context within action functions.
      return actions[nameSpace][actionName].bind(actions[nameSpace]);
    } else {
      // Try to find the action function without namespace.
      if (!actions[actionName]) {
        throw new Error(`Unknown action: ${actionName}`);
      }
      return actions[actionName].bind(actions);
    }
  }

  // If no action name was found, try a custom Function for the string.
  try {
    return new Function("$", handlerString);
  } catch (error) {
    throw new Error(`z-action value is invalid: ${error.message}`);
  }
}

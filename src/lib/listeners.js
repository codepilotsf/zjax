// Both zswaps and zactions will use this to add event listeners to the DOM.
// and also keep track of the listeners so we can remove them.
//
// Dev Note: Modifiers like much of the system make use of the "trigger" object
// (see lib/triggers.js for more info).

import { getDollar, modifiers, utils, debug } from "../lib";

let counter = 0;
const handlers = {};

export function addZjaxListener(trigger, handlerFunction, withDollar = false) {
  counter++;
  const handlerId = `handler${counter}`;
  // If the trigger is event is mount, let's change it internally to mount:<handlerId>
  const mountOrTriggerEvent = trigger.event === "mount" ? `mount:${handlerId}` : trigger.event;
  if (trigger.modifiers.debounce) {
    handlerFunction = modifiers.debounce(handlerFunction, trigger.modifiers.debounce);
  }
  handlers[handlerId] = {
    target: trigger.target,
    event: mountOrTriggerEvent,
    handlerFunction: async function (event) {
      // Process modifiers
      if (!modifiers.processKeyboard(trigger, event)) return;
      if (!modifiers.processMouse(trigger, event)) return;
      if (!modifiers.processOutside(trigger, event)) return;
      if (!modifiers.processOnce(trigger, event)) return;
      if (!modifiers.processPreventOrStop(trigger, event)) return;
      if (!(await modifiers.processDelay(trigger, event))) return;

      // Processing modifiers and calling the handler function is mostly the same for
      // swaps and actions with one important exeption: Swaps do not need the $ object
      // but actions do. So we need to pass the $ object to the handler function only for actions.
      const eventOrDollar = withDollar ? getDollar(trigger.node, event) : event;
      await handlerFunction(eventOrDollar);
    },
  };
  trigger.target.addEventListener(mountOrTriggerEvent, handlers[handlerId].handlerFunction);

  // Add a mutation observer to remove the event listener when the node is removed
  attachMutationObserver(trigger, handlerId);

  // One last thing, if the trigger is a mount event, let's fire that event now.
  if (trigger.event === "mount") {
    trigger.target.dispatchEvent(new Event(mountOrTriggerEvent));
  }
}

export function removeAllZjaxListeners() {
  debug("Removing all zjax event listeners");
  for (const handlerId in handlers) {
    const h = handlers[handlerId];
    h.target.removeEventListener(h.event, h.handlerFunction);
    delete handlers[handlerId];
  }
}

function attachMutationObserver(trigger, handlerId) {
  // Create a MutationObserver to watch for node removal
  // When the node is removed, remove the event listener
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === trigger.node || removedNode.contains(trigger.node)) {
          // Remove event listener when the node is removed from DOM
          if (handlers[handlerId])
            trigger.target.removeEventListener(trigger.event, handlers[handlerId].handlerFunction);
          delete handlers[handlerId]; // Remove the handler from the list
          zjax.debug &&
            debug(
              `Removing event listener for ${utils.prettyNodeName(trigger.node)} (no longer in DOM)`,
            );
          observer.disconnect(); // Stop observing
          return;
        }
      }
    }
  });

  // Observe the parent of the target node for childList changes
  observer.observe(document, { childList: true, subtree: true });
}

// Both zswaps and zactions will use this to add event listeners to the DOM.
// and also keep track of the listeners so we can remove them.
//
// Dev Note: Modifiers like much of the system make use of the "trigger" object
// (see lib/triggers.js for more info).

import { getDollar, modifiers, utils, debug } from "../lib";

let counter = 0;
const handlers = {};
let sharedObserver = null;

export function addZjaxListener(trigger, handlerFunction, withDollar = false) {
  counter++;
  const handlerId = `handler${counter}`;
  // If the trigger is event is mount, let's change it internally to mount:<handlerId>
  const mountOrTriggerEvent = trigger.event === "mount" ? `mount:${handlerId}` : trigger.event;
  if (trigger.modifiers.debounce) {
    handlerFunction = modifiers.debounce(handlerFunction, trigger.modifiers.debounce);
  }
  handlers[handlerId] = {
    node: trigger.node,
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

  // Make sure the shared mutation observer (which removes listeners for any
  // handler whose node leaves the DOM) is running.
  ensureSharedObserver();

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

function ensureSharedObserver() {
  // Only ever create one observer, no matter how many handlers get added.
  if (sharedObserver) return;

  // Watch for node removal across every z-swap/z-action handler at once: one
  // callback per mutation batch, checked against every tracked handler, instead
  // of one dedicated observer (and callback) per handler.
  sharedObserver = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      for (const removedNode of mutation.removedNodes) {
        for (const handlerId in handlers) {
          const handler = handlers[handlerId];
          if (removedNode === handler.node || removedNode.contains(handler.node)) {
            // Remove event listener when the node is removed from DOM
            handler.target.removeEventListener(handler.event, handler.handlerFunction);
            delete handlers[handlerId]; // Remove the handler from the list
            debug(`Removing event listener for ${utils.prettyNodeName(handler.node)} (no longer in DOM)`);
          }
        }
      }
    }
  });

  // Observe the whole document for childList changes
  sharedObserver.observe(document, { childList: true, subtree: true });
}

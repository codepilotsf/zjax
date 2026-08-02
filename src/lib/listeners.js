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
  // Mount and unmount are namespaced per-handler internally (e.g. "mount:handler3")
  // so dispatching one handler's synthetic event doesn't also fire every other
  // @mount/@unmount handler sharing the same target (e.g. multiple @mount.document).
  const isMountOrUnmount = trigger.event === "mount" || trigger.event === "unmount";
  const eventName = isMountOrUnmount ? `${trigger.event}:${handlerId}` : trigger.event;
  if (trigger.modifiers.debounce) {
    handlerFunction = modifiers.debounce(handlerFunction, trigger.modifiers.debounce);
  }
  handlers[handlerId] = {
    node: trigger.node,
    target: trigger.target,
    event: eventName,
    isUnmount: trigger.event === "unmount",
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
  trigger.target.addEventListener(eventName, handlers[handlerId].handlerFunction);

  // Make sure the shared mutation observer (which removes listeners for any
  // handler whose node leaves the DOM, and fires @unmount handlers) is running.
  ensureSharedObserver();

  // One last thing, if the trigger is a mount event, let's fire that event now.
  if (trigger.event === "mount") {
    trigger.target.dispatchEvent(new Event(eventName));
  }
}

export function removeAllZjaxListeners() {
  debug("Removing all zjax event listeners");
  for (const handlerId in handlers) {
    const h = handlers[handlerId];
    // A full reset (e.g. on turbo:load) is still a node leaving the DOM as far
    // as @unmount is concerned, so fire it here too.
    if (h.isUnmount) {
      h.target.dispatchEvent(new Event(h.event));
    }
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
            // MutationObserver callbacks run as a microtask after the mutating
            // code finishes, so a synchronous move (removeChild + appendChild
            // elsewhere, as jQuery/Sortable do for drag-and-drop) has already
            // completed by the time we get here. If the node is still connected,
            // it was relocated, not removed -- leave its listener alone.
            if (handler.node.isConnected) continue;

            // Fire @unmount handlers while the node's listener is still attached,
            // then remove the event listener since the node has left the DOM
            if (handler.isUnmount) {
              handler.target.dispatchEvent(new Event(handler.event));
            }
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

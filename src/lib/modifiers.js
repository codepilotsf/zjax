import { constants } from "../lib";

export function processKeyboard(t, event) {
  // Check for key modifiers?
  if (constants.keyboardEvents.includes(t.event)) {
    if (t.modifiers.shift && !event.shiftKey) return false;
    if (t.modifiers.ctrl && !event.ctrlKey) return false;
    if (t.modifiers.alt && !event.altKey) return false;
    if (t.modifiers.meta && !event.metaKey) return false;
    // If a keyname is specified, check if it matches the event key (or is special value 'any')
    if (t.modifiers.keyName && event.key !== t.modifiers.keyName && t.modifiers.keyName !== "any") {
      return false;
    }
  }
  return true;
}

export function processMouse(t, event) {
  // Check for mouse modifiers?
  if (constants.mouseEvents.includes(t.event)) {
    if (t.modifiers.shift && !event.shiftKey) return false;
    if (t.modifiers.ctrl && !event.ctrlKey) return false;
    if (t.modifiers.alt && !event.altKey) return false;
    if (t.modifiers.meta && !event.metaKey) return false;
  }
  return true;
}

export function processOutside(t, event) {
  if (t.modifiers.outside) {
    if (t.node.contains(event.target)) return false;
  }
  return true;
}

export function processOnce(t) {
  // Check for once modifier?
  if (t.node.hasFiredOnce) return false;
  if (t.modifiers.once) {
    t.node.hasFiredOnce = true;
  }
  return true;
}

export function processPreventOrStop(t, event) {
  // Prevent default or stop propagation?
  if (t.modifiers.prevent) event.preventDefault();
  if (t.modifiers.stop) event.stopPropagation();
  return true;
}

export async function processDelay(t) {
  // Check for timer modifiers?
  if (t.modifiers.delay) {
    await new Promise((resolve) => setTimeout(resolve, t.modifiers.delay));
  }
  return true;
}

export function debounce(func, delay = 300) {
  let timeoutId;

  return function (...args) {
    const context = this;

    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

// export function debounce(func, delay) {
//   let timeoutId;
//   return function (...args) {
//     const context = this;
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(() => {
//       func.apply(context, args);
//     }, delay);
//   };
// }

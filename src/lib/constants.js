// Constants
export const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
export const responseTypes = ["outer", "inner"];
export const swapTypes = [
  "outer",
  "inner",
  "before",
  "after",
  "prepend",
  "append",
  "none",
  "delete",
];
export const isVTSupported = document.startViewTransition !== undefined;
export const attrsToNotFreeze = ["id", "z-swap", "z-action", "z-confirm", "z-active", "z-validate"];

export const globalTriggerModifiers = ["document", "window", "once", "prevent", "stop"];

export const timerTriggerModifiers = ["delay", "debounce"];

export const mouseEvents = [
  "click",
  "auxclick",
  "dblclick",
  "mousedown",
  "mouseup",
  "mouseover",
  "mousemove",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "contextmenu",
];

export const mouseTriggerModifiers = ["ctrl", "shift", "alt", "meta"];

export const keyboardEvents = ["keydown", "keyup"];

export const keyboardTriggerModifiers = ["keyName", "ctrl", "shift", "alt", "meta"];

export const namedKeyMap = {
  enter: "Enter",
  escape: "Escape",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  insert: "Insert",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  space: " ",
  comma: ",",
  period: ".",
  semicolon: ";",
  singlequote: "'",
  doublequote: '"',
  backtick: "`",
  slash: "/",
  backslash: "\\",
  bracketleft: "[",
  bracketright: "]",
  curlybracketleft: "{",
  curlybracketright: "}",
  minus: "-",
  equal: "=",
  plus: "+",
  underscore: "_",
  ampersand: "&",
  asterisk: "*",
  at: "@",
  dollar: "$",
  percent: "%",
  caret: "^",
  exclamation: "!",
  tilde: "~",
  pipe: "|",
  colon: ":",
  question: "?",
  underscore: "_",
  lessthan: "<",
  greaterthan: ">",
  hash: "#",
};

// Create a global zjax object for setting debug mode and registering JS actions.
window.zjax = getGlobalZjaxObject();

// Parse the DOM on load.
addEventListener("DOMContentLoaded", function () {
  parseZSwaps();
});

function getGlobalZjaxObject() {
  return {
    debug: false,
    actions: {},
    register: function (arg1, arg2) {
      // Usage:
      // zjax.register({
      //   openPanel($) {
      //     console.log('openPanel called by element', $.el);
      //   }
      // })
      // An optional namespace can be specified as arg1 so that actions
      // can be called like z-action="books.closePanel"
      const namespace = arg2 ? arg1 : null;
      const object = arg2 ? arg2 : arg1;
      let actionsTarget;
      if (namespace) {
        this.actions[namespace] = {};
        actionsTarget = this.actions[namespace];
      } else {
        actionsTarget = this.actions;
      }
      Object.keys(object).forEach(function (name) {
        const handler = object[name];
        actionsTarget[name] = handler;
      });
    },
  };
}

function parseZSwaps() {
  document.querySelectorAll("[z-swap]").forEach(function (el) {
    try {
      const valueString = collapseCommas(el.getAttribute("z-swap"));
      const valueParts = valueString.split(/\s/);
      if (valueParts.length < 1 || valueParts.length > 4) {
        throw new Error("Must have between 1 and 4 parts separated by spaces.");
      }
      // First pop off the last array item which should be the swap specifier
      const swapString = valueParts.pop() || null;
      // Next pop off the first array item only if it's a valid trigger specifier
      const triggerString =
        valueParts[0] && valueParts[0].startsWith("@")
          ? valueParts.shift()
          : null;
      // With max two items left, the last one should be the endpoint
      const endpointString = valueParts.pop() || null;
      // And if anything is left, it should be the method
      const methodString = valueParts.pop() || null;
      // Now we can get the trigger, method, endpoint, and swaps
      const zSwap = {
        trigger: getTrigger(triggerString, el),
        method: getMethod(methodString, el),
        endpoint: getEndpoint(endpointString, el),
        swaps: getSwaps(swapString),
      };
      // Add the swap function listener to the element
      const zSwapFunction = getZSwapFunction(zSwap, el);
      attachEventListener(zSwap.trigger, zSwapFunction, el);
      attachMutationObserver(zSwap.trigger, zSwapFunction, el);
    } catch (error) {
      console.error(
        `ZJAX ERROR – Unable to parse z-swap: ${error.message}\n`,
        el
      );
    }
  });
}

// Helper functions

function getTrigger(triggerString, el) {
  if (triggerString) {
    return triggerString.substr(1);
  }
  if (el.tagName === "FORM") {
    return "submit";
  }
  return "click";
}

function getMethod(methodString, el) {
  if (methodString) {
    const method = methodString.toUpperCase();
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      throw new Error(`Invalid method: ${method}`);
    }
    return method;
  }
  if (el.tagName === "FORM") {
    return el.getAttribute("method") || "POST";
  }
  return "GET";
}

function getEndpoint(endpointString, el) {
  // If we're seeing a method here, that means the endpoint is missing.
  if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(endpointString)) {
    throw new Error("Missing required endpoint value.");
  }
  if (endpointString) {
    return endpointString;
  }
  if (el.tagName === "A") {
    return el.getAttribute("href");
  }
  if (el.tagName === "FORM") {
    return el.getAttribute("action");
  }
  throw new Error("Missing required endpoint value.");
}

function getSwaps(swapString) {
  // Parse a  like: "foo->#bar|inner, #baz" into an array of objects
  // [
  //   { source: "foo", target: "#bar", swapStringType: "inner" },
  //   { source: "#baz", target: "#baz", swapType: null }
  // ]
  const swaps = [];
  swapString.split(",").forEach(function (swapPart) {
    const swap = {};
    const sourceAndTarget = swapPart.split("->");
    const targetAndSwapType = sourceAndTarget.pop();
    const [target, swapType] = targetAndSwapType.split("|");
    const source = sourceAndTarget[0] || target;
    swap["source"] = source;
    swap["target"] = target;
    swap["swapType"] = swapType || "outer";
    swaps.push(swap);
  });
  return swaps;
}

function getZSwapFunction(zSwap, el) {
  return async function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (zjax.debug) {
      console.log("zjax", zSwap, el);
    }
    // Call the action
    try {
      // Get formData?
      // let formData
      const response = await fetch(zSwap.endpoint, {
        method: zSwap.method,
        body: null,
      });
      if (!response.ok) {
        // Replace the entire HTML and follow redirects
        return;
      }
      const responseDOM = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );
      // Swap elements
      zSwap.swaps.forEach(function (swap) {
        const newNode = responseDOM.querySelector(swap.source);
        if (!newNode) {
          throw new Error(
            `Source element ${swap.source} does not exist in response DOM`
          );
        }
        const existingNode = document.querySelector(swap.target);
        if (!existingNode) {
          throw new Error(
            `Target element '${swap.target}' does not exist in local DOM`
          );
        }
        swapOneElement(existingNode, newNode, swap.swapType);
      });
    } catch (error) {
      console.error(
        `ZJAX ERROR – Unable to execute z-swap function: ${error.message}\n`,
        el
      );
    }
  };
}

function swapOneElement(existingNode, newNode, swapType) {
  if (swapType === "outer") {
    Idiomorph.morph(existingNode, newNode);
    return;
  }
  if (swapType === "inner") {
    Idiomorph.morph(existingNode, newNode, { morphStyle: "innerHTML" });
    return;
  }
  if (swapType === "before") {
    existingNode.parentNode.insertBefore(newNode, existingNode);
    return;
  }
  if (swapType === "after") {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    return;
  }
  if (swapType === "prepend") {
    existingNode.insertBefore(newNode, existingNode.firstChild);
    return;
  }
  if (swapType === "append") {
    existingNode.appendChild(newNode);
    return;
  }
  if (swapType === "delete") {
    existingNode.remove();
    return;
  }
  if (swapType === "none") {
    return;
  }
  throw new Error(`Unknown swap type: ${swapType}`);
}

function attachEventListener(trigger, handler, el) {
  el.addEventListener(trigger, handler);
}

function attachMutationObserver(trigger, handler, el) {
  // Create a MutationObserver to watch for node removal
  // When the node is removed, remove the event listener
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === el || removedNode.contains(el)) {
          // Remove event listener when the el is removed from DOM
          el.removeEventListener(trigger, handler);
          console.log("Event listener removed because node is detached.");
          observer.disconnect(); // Stop observing
          return;
        }
      }
    }
  });

  // Observe the parent of the target node for childList changes
  observer.observe(document.body, { childList: true, subtree: true });
}

function collapseCommas(str) {
  // If commas have spaces next to them, remove those spaces.
  return str.replace(/\s*,\s*/g, ",");
}

const Idiomorph = (function () {
  "use strict";
  let o = new Set();
  let n = {
    morphStyle: "outerHTML",
    callbacks: {
      beforeNodeAdded: t,
      afterNodeAdded: t,
      beforeNodeMorphed: t,
      afterNodeMorphed: t,
      beforeNodeRemoved: t,
      afterNodeRemoved: t,
      beforeAttributeUpdated: t,
    },
    head: {
      style: "merge",
      shouldPreserve: function (e) {
        return e.getAttribute("im-preserve") === "true";
      },
      shouldReAppend: function (e) {
        return e.getAttribute("im-re-append") === "true";
      },
      shouldRemove: t,
      afterHeadMorphed: t,
    },
  };
  function e(e, t, n = {}) {
    if (e instanceof Document) {
      e = e.documentElement;
    }
    if (typeof t === "string") {
      t = k(t);
    }
    let l = y(t);
    let r = p(e, l, n);
    return a(e, l, r);
  }
  function a(r, i, o) {
    if (o.head.block) {
      let t = r.querySelector("head");
      let n = i.querySelector("head");
      if (t && n) {
        let e = c(n, t, o);
        Promise.all(e).then(function () {
          a(r, i, Object.assign(o, { head: { block: false, ignore: true } }));
        });
        return;
      }
    }
    if (o.morphStyle === "innerHTML") {
      l(i, r, o);
      return r.children;
    } else if (o.morphStyle === "outerHTML" || o.morphStyle == null) {
      let e = M(i, r, o);
      let t = e?.previousSibling;
      let n = e?.nextSibling;
      let l = d(r, e, o);
      if (e) {
        return N(t, l, n);
      } else {
        return [];
      }
    } else {
      throw "Do not understand how to morph style " + o.morphStyle;
    }
  }
  function u(e, t) {
    return t.ignoreActiveValue && e === document.activeElement;
  }
  function d(e, t, n) {
    if (n.ignoreActive && e === document.activeElement) {
    } else if (t == null) {
      if (n.callbacks.beforeNodeRemoved(e) === false) return e;
      e.remove();
      n.callbacks.afterNodeRemoved(e);
      return null;
    } else if (!g(e, t)) {
      if (n.callbacks.beforeNodeRemoved(e) === false) return e;
      if (n.callbacks.beforeNodeAdded(t) === false) return e;
      e.parentElement.replaceChild(t, e);
      n.callbacks.afterNodeAdded(t);
      n.callbacks.afterNodeRemoved(e);
      return t;
    } else {
      if (n.callbacks.beforeNodeMorphed(e, t) === false) return e;
      if (e instanceof HTMLHeadElement && n.head.ignore) {
      } else if (e instanceof HTMLHeadElement && n.head.style !== "morph") {
        c(t, e, n);
      } else {
        r(t, e, n);
        if (!u(e, n)) {
          l(t, e, n);
        }
      }
      n.callbacks.afterNodeMorphed(e, t);
      return e;
    }
  }
  function l(n, l, r) {
    let i = n.firstChild;
    let o = l.firstChild;
    let a;
    while (i) {
      a = i;
      i = a.nextSibling;
      if (o == null) {
        if (r.callbacks.beforeNodeAdded(a) === false) return;
        l.appendChild(a);
        r.callbacks.afterNodeAdded(a);
        H(r, a);
        continue;
      }
      if (b(a, o, r)) {
        d(o, a, r);
        o = o.nextSibling;
        H(r, a);
        continue;
      }
      let e = A(n, l, a, o, r);
      if (e) {
        o = v(o, e, r);
        d(e, a, r);
        H(r, a);
        continue;
      }
      let t = S(n, l, a, o, r);
      if (t) {
        o = v(o, t, r);
        d(t, a, r);
        H(r, a);
        continue;
      }
      if (r.callbacks.beforeNodeAdded(a) === false) return;
      l.insertBefore(a, o);
      r.callbacks.afterNodeAdded(a);
      H(r, a);
    }
    while (o !== null) {
      let e = o;
      o = o.nextSibling;
      T(e, r);
    }
  }
  function f(e, t, n, l) {
    if (e === "value" && l.ignoreActiveValue && t === document.activeElement) {
      return true;
    }
    return l.callbacks.beforeAttributeUpdated(e, t, n) === false;
  }
  function r(t, n, l) {
    let e = t.nodeType;
    if (e === 1) {
      const r = t.attributes;
      const i = n.attributes;
      for (const o of r) {
        if (f(o.name, n, "update", l)) {
          continue;
        }
        if (n.getAttribute(o.name) !== o.value) {
          n.setAttribute(o.name, o.value);
        }
      }
      for (let e = i.length - 1; 0 <= e; e--) {
        const a = i[e];
        if (f(a.name, n, "remove", l)) {
          continue;
        }
        if (!t.hasAttribute(a.name)) {
          n.removeAttribute(a.name);
        }
      }
    }
    if (e === 8 || e === 3) {
      if (n.nodeValue !== t.nodeValue) {
        n.nodeValue = t.nodeValue;
      }
    }
    if (!u(n, l)) {
      s(t, n, l);
    }
  }
  function i(t, n, l, r) {
    if (t[l] !== n[l]) {
      let e = f(l, n, "update", r);
      if (!e) {
        n[l] = t[l];
      }
      if (t[l]) {
        if (!e) {
          n.setAttribute(l, t[l]);
        }
      } else {
        if (!f(l, n, "remove", r)) {
          n.removeAttribute(l);
        }
      }
    }
  }
  function s(n, l, r) {
    if (
      n instanceof HTMLInputElement &&
      l instanceof HTMLInputElement &&
      n.type !== "file"
    ) {
      let e = n.value;
      let t = l.value;
      i(n, l, "checked", r);
      i(n, l, "disabled", r);
      if (!n.hasAttribute("value")) {
        if (!f("value", l, "remove", r)) {
          l.value = "";
          l.removeAttribute("value");
        }
      } else if (e !== t) {
        if (!f("value", l, "update", r)) {
          l.setAttribute("value", e);
          l.value = e;
        }
      }
    } else if (n instanceof HTMLOptionElement) {
      i(n, l, "selected", r);
    } else if (
      n instanceof HTMLTextAreaElement &&
      l instanceof HTMLTextAreaElement
    ) {
      let e = n.value;
      let t = l.value;
      if (f("value", l, "update", r)) {
        return;
      }
      if (e !== t) {
        l.value = e;
      }
      if (l.firstChild && l.firstChild.nodeValue !== e) {
        l.firstChild.nodeValue = e;
      }
    }
  }
  function c(e, t, l) {
    let r = [];
    let i = [];
    let o = [];
    let a = [];
    let u = l.head.style;
    let d = new Map();
    for (const n of e.children) {
      d.set(n.outerHTML, n);
    }
    for (const s of t.children) {
      let e = d.has(s.outerHTML);
      let t = l.head.shouldReAppend(s);
      let n = l.head.shouldPreserve(s);
      if (e || n) {
        if (t) {
          i.push(s);
        } else {
          d.delete(s.outerHTML);
          o.push(s);
        }
      } else {
        if (u === "append") {
          if (t) {
            i.push(s);
            a.push(s);
          }
        } else {
          if (l.head.shouldRemove(s) !== false) {
            i.push(s);
          }
        }
      }
    }
    a.push(...d.values());
    m("to append: ", a);
    let f = [];
    for (const c of a) {
      m("adding: ", c);
      let n = document
        .createRange()
        .createContextualFragment(c.outerHTML).firstChild;
      m(n);
      if (l.callbacks.beforeNodeAdded(n) !== false) {
        if (n.href || n.src) {
          let t = null;
          let e = new Promise(function (e) {
            t = e;
          });
          n.addEventListener("load", function () {
            t();
          });
          f.push(e);
        }
        t.appendChild(n);
        l.callbacks.afterNodeAdded(n);
        r.push(n);
      }
    }
    for (const h of i) {
      if (l.callbacks.beforeNodeRemoved(h) !== false) {
        t.removeChild(h);
        l.callbacks.afterNodeRemoved(h);
      }
    }
    l.head.afterHeadMorphed(t, { added: r, kept: o, removed: i });
    return f;
  }
  function m() {}
  function t() {}
  function h(e) {
    let t = {};
    Object.assign(t, n);
    Object.assign(t, e);
    t.callbacks = {};
    Object.assign(t.callbacks, n.callbacks);
    Object.assign(t.callbacks, e.callbacks);
    t.head = {};
    Object.assign(t.head, n.head);
    Object.assign(t.head, e.head);
    return t;
  }
  function p(e, t, n) {
    n = h(n);
    return {
      target: e,
      newContent: t,
      config: n,
      morphStyle: n.morphStyle,
      ignoreActive: n.ignoreActive,
      ignoreActiveValue: n.ignoreActiveValue,
      idMap: C(e, t),
      deadIds: new Set(),
      callbacks: n.callbacks,
      head: n.head,
    };
  }
  function b(e, t, n) {
    if (e == null || t == null) {
      return false;
    }
    if (e.nodeType === t.nodeType && e.tagName === t.tagName) {
      if (e.id !== "" && e.id === t.id) {
        return true;
      } else {
        return L(n, e, t) > 0;
      }
    }
    return false;
  }
  function g(e, t) {
    if (e == null || t == null) {
      return false;
    }
    return e.nodeType === t.nodeType && e.tagName === t.tagName;
  }
  function v(t, e, n) {
    while (t !== e) {
      let e = t;
      t = t.nextSibling;
      T(e, n);
    }
    H(n, e);
    return e.nextSibling;
  }
  function A(n, e, l, r, i) {
    let o = L(i, l, e);
    let t = null;
    if (o > 0) {
      let e = r;
      let t = 0;
      while (e != null) {
        if (b(l, e, i)) {
          return e;
        }
        t += L(i, e, n);
        if (t > o) {
          return null;
        }
        e = e.nextSibling;
      }
    }
    return t;
  }
  function S(e, t, n, l, r) {
    let i = l;
    let o = n.nextSibling;
    let a = 0;
    while (i != null) {
      if (L(r, i, e) > 0) {
        return null;
      }
      if (g(n, i)) {
        return i;
      }
      if (g(o, i)) {
        a++;
        o = o.nextSibling;
        if (a >= 2) {
          return null;
        }
      }
      i = i.nextSibling;
    }
    return i;
  }
  function k(n) {
    let l = new DOMParser();
    let e = n.replace(/<svg(\s[^>]*>|>)([\s\S]*?)<\/svg>/gim, "");
    if (e.match(/<\/html>/) || e.match(/<\/head>/) || e.match(/<\/body>/)) {
      let t = l.parseFromString(n, "text/html");
      if (e.match(/<\/html>/)) {
        t.generatedByIdiomorph = true;
        return t;
      } else {
        let e = t.firstChild;
        if (e) {
          e.generatedByIdiomorph = true;
          return e;
        } else {
          return null;
        }
      }
    } else {
      let e = l.parseFromString(
        "<body><template>" + n + "</template></body>",
        "text/html"
      );
      let t = e.body.querySelector("template").content;
      t.generatedByIdiomorph = true;
      return t;
    }
  }
  function y(e) {
    if (e == null) {
      const t = document.createElement("div");
      return t;
    } else if (e.generatedByIdiomorph) {
      return e;
    } else if (e instanceof Node) {
      const t = document.createElement("div");
      t.append(e);
      return t;
    } else {
      const t = document.createElement("div");
      for (const n of [...e]) {
        t.append(n);
      }
      return t;
    }
  }
  function N(e, t, n) {
    let l = [];
    let r = [];
    while (e != null) {
      l.push(e);
      e = e.previousSibling;
    }
    while (l.length > 0) {
      let e = l.pop();
      r.push(e);
      t.parentElement.insertBefore(e, t);
    }
    r.push(t);
    while (n != null) {
      l.push(n);
      r.push(n);
      n = n.nextSibling;
    }
    while (l.length > 0) {
      t.parentElement.insertBefore(l.pop(), t.nextSibling);
    }
    return r;
  }
  function M(e, t, n) {
    let l;
    l = e.firstChild;
    let r = l;
    let i = 0;
    while (l) {
      let e = w(l, t, n);
      if (e > i) {
        r = l;
        i = e;
      }
      l = l.nextSibling;
    }
    return r;
  }
  function w(e, t, n) {
    if (g(e, t)) {
      return 0.5 + L(n, e, t);
    }
    return 0;
  }
  function T(e, t) {
    H(t, e);
    if (t.callbacks.beforeNodeRemoved(e) === false) return;
    e.remove();
    t.callbacks.afterNodeRemoved(e);
  }
  function E(e, t) {
    return !e.deadIds.has(t);
  }
  function x(e, t, n) {
    let l = e.idMap.get(n) || o;
    return l.has(t);
  }
  function H(e, t) {
    let n = e.idMap.get(t) || o;
    for (const l of n) {
      e.deadIds.add(l);
    }
  }
  function L(e, t, n) {
    let l = e.idMap.get(t) || o;
    let r = 0;
    for (const i of l) {
      if (E(e, i) && x(e, i, n)) {
        ++r;
      }
    }
    return r;
  }
  function R(e, n) {
    let l = e.parentElement;
    let t = e.querySelectorAll("[id]");
    for (const r of t) {
      let t = r;
      while (t !== l && t != null) {
        let e = n.get(t);
        if (e == null) {
          e = new Set();
          n.set(t, e);
        }
        e.add(r.id);
        t = t.parentElement;
      }
    }
  }
  function C(e, t) {
    let n = new Map();
    R(e, n);
    R(t, n);
    return n;
  }
  return { morph: e, defaults: n };
})();

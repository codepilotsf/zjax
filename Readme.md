
# Zjax

Zjax is a lightweight yet powerful JavaScript library (4.9K gzipped) that brings modern SPA-like interactivity to your web pages with minimal effort. By simply adding `z-swap` and `z-action` attributes to your HTML elements, you can dynamically update parts of a web page or bind client-side JavaScript actions directly to the DOM — all without writing any verbose JavaScript code.

Inspired by HTMX, Hotwire, and AlpineJS and compatible with *any* SSR backend like Rails, Laravel, Django, Astro – or even Wordpress, Zjax seamlessly integrates into your workflow.

## Getting started

Just include the Zjax CDN link in your document head.

```html
<head>
  <script src="https://unpkg.com/zjax@3.0.4"></script>
  ...
</head>
```

You can now use Zjax attributes anywhere in your project.

### z-swap example

```html
<button z-swap="@click /about-us #content">Go</button>
<div id="content"></div>
```

When clicked, this button will fetch `/about-us` and replace the local `#content` element with the `#content` element found in the response.

### z-action example


```html
<button z-action="@click $('#menu').addClass('active')">Go</button>
<div id="menu">...</div>
```

Clicking this button will simply add the CSS class `active` to the `#menu` element.



---

**Full Documentation: [https://zjax.dev/docs](https://zjax.dev/docs)**

---

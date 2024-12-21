# ZJAX

ZJAX is a lightweight yet powerful JavaScript library (just 2KB gzipped) that brings modern SPA-like interactivity to your web pages with minimal effort. By simply adding intuitive "z-tag" attributes like `z-swap` and `z-action` to your HTML elements, ZJAX lets you dynamically update parts of a web page or bind client-side JavaScript actions directly to the DOM—all without writing verbose JavaScript code.

Inspired by HTMX, Hotwire, and Unpoly and compatible with *any* SSR backend like Rails, Laravel, Django, Astro – or even Wordpress, ZJAX seamlessly integrates into your workflow. 

## Getting started

To install ZJAX, simply include the ZJAX CDN link in your document head.

```html
<head>
  <script src="https://unpkg.com/zjax"></script>
  ...
</head>
```

You can now use ZJAX attributes anywhere in your project.



# `z-swap`

The main workhorse of ZJAX is the `z-swap` attribute which can be added to any HTML tag to specify the elements we want to swap.

You can try this right now with a plain HTML file.

**index.html**

```html
<html>
  <head>
    <script src="https://unpkg.com/zjax"></script>
  </head>
  
  <body>
    <h1>This is ZJAX</h1>
    <a href="https://httpbin.org/html" z-swap="p">Fetch Moby Dick</a>
    <p>This will be replaced by ZJAX.</p>    
  </body>
</html>
```

By adding the `z-swap` tag, this link will be hijacked by ZJAX, replacing it's default behavior with an AJAX request to httpbin.org. It then replaces the closest `p` element in our local DOM with the `p` element found in the response HTML *without* affecting any other parts of the page. 

In this example, we specified only the element to be swapped and other specifiers are inferred from context. By default, for an `a` tag, `z-swap` will listen for a `click` event as its Trigger, the HTTP Method will be `GET`, and the Endpoint URL is inferred from `href` value. But these can also be defined explicitly. For the example above, this is the same:
```html
<a href="" z-swap="@click GET https://httpbin.org/html p">
```

We've omitted the `href` value for brevity and because it will be ignored anyway since the explicitly specified endpoint URL takes precedence.

> ## Format of `z-swap` value
>
>  `z-swap="[@Trigger>] [HTTP-Method] [Endpoint] [Swap-Element]"`
>
> All specifiers are optional as long as they can be inferred from context. Each specifier is separated by a space. The order shown above is the recommended convention for readability. Remember that the Trigger must always be prefixed with "@" and that a valid endpoint must always start with "http://", "https://", "/", "./", or can it can be a single dot, ".".

---

#### Specifying the Trigger

Try prepending `@mouseover` to the `z-swap` value.

```html
<a href="https://npmjs.com" z-swap="@mouseover main">
  Click me
</a>
```

Any standard DOM event as well as some special ones added by ZJAX and any custom events you have defined globally can be specified with an @-sign like `@submit`, `@blur`, `@input`, `@dblclick`, `@my-custom-event`, etc.

#### Specifying the Endpoint

The example above infers the endpoint from the `a`-tag's `href` value. But for a `button` tag, there is no `href` attribute – so you'll want to specify that too as part of the `z-swap` value.

```html
<button z-swap="@mouseover https://httpbin.org/html p">
  Click me
</a>
```

The Endpoint specifier can be any valid URL including local absolute or relative paths as long as it starts with the protocol ("http://" or "https://"), or starts with an absolute or relative path which includes a slash ("/", or "./"), or is a single dot to refer to the current URL (".").

#### Specifying the HTTP-Method

The example above defaults to using a GET method which is the default when using `z-swap` on any element except `form` (then the default is POST). The HTTP methods GET, POST, PUT, PATCH, or DELETE are supported.

```html
<button z-swap="DELETE /books/123 #book-form">
  Click me
</a>
```

Notice that in the example above, we didn't specify the Trigger event because the default `click` is just fine for our button in this case. Here, the HTTP method and a local URL are specified along with the element to be swapped.

#### Specifying the SWAP-Element

The swap element is specified with CSS selector syntax like `p`, `#cart`, or `footer > span`. If only one element is specified, it will be used to identify both the incoming element and the existing element to be replaced. Specifying multiple elements to swap at once as well as specifying separate incoming and existing element selectors are also supported. The default Swap-Type which replaces the entire element can also be changed.

#### Swapping multiple elements

We aren't limited to swapping just one element. Multiple elements can be swapped at the same time separated by commas. 

```html
<button z-swap="/books/123 #book-form, #cart-total">
  Click me
</a>
```

In the example above, both the `#book-form` and `#cart-total` elements will be swapped out and replaced with elements found in the response. 

#### Swapping incoming->existing elements

Sometimes the selector for the existing element isn't the same as the incoming. Use the `->` operator to specify existing and incoming elements separately.

```html
<button z-swap="/books/123 #book-form, #updated-cart->#cart">
  Click me
</a>
```

Use a `*` character to specify the entire page content.

```html
<button z-swap="/books/123 *->#book-detail">
  Click me
</a>
```

In the above example, presumably the `/books/123` route returns a partial containing only the elements we need.

#### Specifying the Swap-Type

The default Swap-Type is `outer` which replaces the element in its entirety. Alternatively, you may want to replace only the inner content of the element, or maybe insert the new element *after* the existing one. The Swap-Type can be appended to the existing element using the pipe `|` character. Note that the Swap-Type only affects the existing element.

```html
<button z-swap="/books/123 #cart-total|after">
  Click me
</a>
```

Swap type available include:

`outer` - Morph the entire element (default)
`inner` - Morph only inner content
`before` - Insert before this element
`prepend` - Insert before all other inner content
`after` - Insert after this element
`append` - Insert after all other inner content
`delete` - Ignore returned value and delete this element
`none` - Do nothing (typically used with dynamic values)





# `z-action` 

***This is not yet implemented*** 

The `z-action` attribute is used to bind a Javascript method to an element's event listener with syntax similar to `z-swap`. So use `z-swap` to interact with a remote server and use `z-action` to handle client-side only Javascript actions where no round trip to the server is needed (like closing a modal window).

In this example, a `dblclick` event listener is added to the event which will call the `doSomething()` action. 

```html
<div z-action="@dblclick doSomething">
  Do it now!
</div> 
```

In order for this action to work, we need to define it somewhere in our project as ZJAX Action like this:

```html
<script>
	zjax.actions({
    doSomething() {
      alert("I did something!");
    }
  })
</script>
```

#### The `zjax` global object

When ZJAX is loaded, it creates the `window.zjax` object so that the `zjax` object available everywhere in your app. This means you can organize your files however you like. You can stick in a script tag in your document head, add a separate file like "zjax-actions.js" (or whatever), or if your application is complex enough, maybe a directory called "zjax-actions/" with separate files for different sections of your application.

#### Defining Actions

To register actions, call `zjax.actions(<actions-object)` with one or two arguments. Use a single argument to pass an object containing only action functions as its direct properties like this:

```js
zjax.actions({
  openModal() {
    ...
  },
  closeModal() {
    ...
  },
  async handleFileUploadDrop() {
    ...
  }
})
```

#### Registering Actions with a namespace

Actions can also be registered in their own namespace by providing a string as the first argument like this:
```js
zjax.actions('products', {
  addToCart() {
    ...
  },
  removeFromCart() {
    ...
  }
})
```

For this example, the `z-action` would be used like this:

```html
<button z-action="products.addToCart">
  Add To Cart
</button>
```



#### How Actions work

Naturally, an Action function may contain any valid Javascript. Vanilla JS is very powerful these days allowing for full access to DOM manipulation without the need for any JQuery-like library. But ZJAX gives us a couple of handy tools anyway just to make life a bit easier.

#### Adding event listeners with `z-action`

Manually adding event listeners from a JS script somewhere else in your project can be tedious and difficult to manage. Event listeners will also need to be removed at some point or they can start stacking up and eventually cause memory leak issues. 

Instead, we can use a `z-action` tag to not only set up the listener and associate it with a function, but also to remove it automatically when the element is removed from the DOM.

> #### *GOTCHA!*
>
> Watch out for this quirk of HTTP. When a `<script>` tag is added to the DOM for example by a `z-action`, it will be *ignored* by the browser. This means that you can't declare ZJAX Actions within a partial for example. Of course you can use `z-action` attributes in your partials and these will be parsed just fine. But the actual `zjax.action()` function used to *define* the action cannot be within a `<script>` tag contained in a swap response.

##### The `$` Action Helper object

Action functions receive a `$` argument.

```js
doSomething($) {
  ... // Now can acccess the $ object
}
```

This object is called the Action Helper and it provides a few handy properties and methods. 

- `$(<selector)` is a shortcut for `Document.querySelector(<selector>)`.
- `$()` returns the element which triggered this action when no selector is provided.
- `$.swap` performs the same action as a `z-swap` tag and receives the same specifiers except the trigger specifier which is ommited.
- `$.render(<dom>, <selector>[|<swap-type>])` renders DOM elements to the target selector using an optional Swap-Type.
- `await $.get(<url>)` is a shortcut for asynchronously fetching a document with the GET method and returning the response as a parsed DOM object.
- `await $.delete(<url>)` is the same as `$.get` but uses the DELETE method.
- `await $.post(<url>, <payload>)` is a shortcut for asynchronously sending the included `<payload>` with the POST method and returning the response as a parsed DOM object.
- `await $.put(<url, <payload>)`, `$.patch(<url, <payload>)` are the same as `$.post` but using the PUT or PATCH method respectively.

#### Using a ZJAX Action as a `z-swap` trigger

Sometimes it makes sense to trigger a `z-swap` action only once a `z-action` has completed successfully. For example, a `z-action` could be used to create a custom confirmation modal. And the `z-swap` should only happen when/if the user clicks the modal's "yes" button. 

ZJAX make this very simple. 

1. Specify `@action` as the Trigger event for this `z-swap`.
2. Return `true` from the ZJAX Action function to trigger the `z-swap`.

Note that this works for synchronous and asynchronous functions alike.



# `z-confirm`

***This is not yet implemented*** 





# `z-active`

***This is not yet implemented*** 





# `z-validate`

***This is not yet implemented*** 






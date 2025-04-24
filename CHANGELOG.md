## 3.0.4 - 2025-04-24
- Fixed FormData submission – tested and working reliably now
- Added support for POST and other methods on standalone form elements (whether nested inside a form or not)

## 3.0.3 - 2025-04-24
- Reworked FormData ro improve submission reliability and also to submit raw FormData object instead of converting to a string first

## 3.0.2 - 2025-04-23
- Added support for $.response for use within swap error handlers

## 3.0.1 - 2025-04-21
- BREAKING CHANGE: Actions now declared as an object (not a function)
- Support added for global swap response error handling

## 2.0.4 - 2025-04-21
- BREAKING CHANGE: Actions are now declared as an object, not a function (see docs)
- Added support for global error handling

## 2.0.3 - 2025-04-20
- Fixed DOM parsing bug which prevented zjax from parsing without turbo::load events (so it worked only with Rails)

## 2.0.2 - 2025-04-16
- Avoids race conditions by parsing actions (and looking for named functions) at run time instead of at DOM load / parse time

## 2.0.1 - 2025-04-13
- ZJAX 2.0!
- Complete refactor, streamline/simplication of codebase
- Added support for @mount action
- $.redirect
- Modifiers: .outside modifier, keyboard modifiers, window/document modifiers
- Multiple trigger event support
- Multiple statements support
- Updated docs

## 1.0.41 - 2025-04-01
- Full support for trigger modifiers on both z-swaps and z-actions

## 1.0.40 - 2025-03-31
- Added multiple trigger modifiers for Z-Actions:
- click.document, click.window, click.outside, click.once, click.prevent, click.stop (not only for click)
- click.delay.2s, input.debounce.200ms (again, this is for all events)
- key event modifiers like keydown.meta.p

## 1.0.39 - 2025-03-30
- Multiple triggers and multiple statements now supported for both z-swaps and z-actions

## 1.0.38 - 2025-03-29
- Added ability for multiple "statements" separated by comma (z-actions only)
- Added ability for multiple triggers like @[click,mouseover]

## 1.0.37 - 2025-03-26
- Fixed `this` context in zjax actions by binding the function to the actions object
- Added preventDefault and stopPropagation to zactions

## 1.0.36 - 2025-03-24
- Fixed a regression that broke zjax.actions()

## 1.0.35 - 2025-02-23
- Fixed bug with POST method on non-form elements 

## 1.0.34 - 2025-02-23
- Converted form data to string instead of JSON

## 1.0.33 - 2025-02-23
- WIP: Fixing formData body

## 1.0.32 - 2025-02-23
- Fixed a regression causing all z-swaps to fail

## 1.0.31 - 2025-02-22
- Fixed @submit to actually include formData as body

## 1.0.30 - 2025-01-01
- Bug fix: use document.addEventListener for onParse events

## 1.0.29 - 2025-01-01
- Added zjax.onParse config option

## 1.0.28 - 2024-12-30
- Updated docs

## 1.0.27 - 2024-12-30
- Improved error reporting for z-swap
- Changed @load to use zjax:load under the hood
- Implemented @action trigger functionality
- Docs
- Switched git origin to use GitHub

## 1.0.26 - 2024-12-30
- Updated Readme

## 1.0.25 - 2024-12-30
- ZActions are now parsing for both registered actions and inline functions
- $() now returns target node
- $(<selector>) now works as a shortcut for document.querySelector()
- $.all(<selector) now works as a shortcut for document.querySelectorAll()
- $.event now returns the event object

## 1.0.24 - 2024-12-29
- HTMX style attribute updates to trigger CSS transitions
- Refactored with src modules (ESM)

## 1.0.23 - 2024-12-23
- More readme fixes

## 1.0.22 - 2024-12-23
- Small typo in readme

## 1.0.21 - 2024-12-23
- Added support for @load trigger
- Added docs for @load trigger

## 1.0.20 - 2024-12-23
- Updated Readme to cover inner/outer response types and `*` special swap element specifier

## 1.0.19 - 2024-12-23
- Added support for "inner" or "outer" responseType modifiers

## 1.0.18 - 2024-12-23
- Added minification and included Readme and CHANGELOG in files published to npm

## 1.0.17 - 2024-12-22
- Updated SemVer to also publish to NPM for me

## 1.0.16 - 2024-12-22
- Testing semver script
- Updated semver to commit/push git (but not sure if it works yet)

## 1.0.15 - 2024-12-22
- Testing semver with Git

## 1.0.14 - 2024-12-22
- Support added for swap selector "*" and all references to new->old nodes changed to response->target nodes.

## Previous Versions
- Built up to point of very basic z-swap functionality with debug and full docs for z-swap attribute.


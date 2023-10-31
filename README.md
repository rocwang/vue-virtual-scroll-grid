# Virtual Scroll Grid for Vue 3

This is a reusable component for Vue 3 that renders a list with a huge number of
items (e.g. 1000+ items) as a grid in a performant way.

- [Demo][demo]
- [NPM Package][npm]

## Features

- Use virtual-scrolling / windowing to render the items, so the number of DOM
  nodes is kept low.
- Just use CSS grid to style your grid. Minimum styling opinions form the
  library.
- Support using a paginated API to load the items in the background.
- Support rendering placeholders for unloaded items.
- Support both vertical and horizontal scroll.
- Loaded items are cached for better performance.

## Code Examples

- [As an ES module (with a bundler)][esm]
- [As a Universal Module Definition (no bundler)][umd]

## Install

```shell
npm install vue-virtual-scroll-grid
```

## Available Props

| Name                       | Description                                                                       | Type                                                           | Validation                                                          |
| -------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `length`                   | The number of items in the list                                                   | `number`                                                       | Required, an integer greater than or equal to 0                     |
| `pageProvider`             | The callback that returns a page of items as a promise. `pageNumber` start with 0 | `(pageNumber: number, pageSize: number) => Promise<unknown[]>` | Required                                                            |
| `pageSize`                 | The number of items in a page from the item provider (e.g. a backend API)         | `number`                                                       | Required, an integer greater than or equal to 1                     |
| `pageProviderDebounceTime` | Debounce window in milliseconds on the calls to `pageProvider`                    | `number`                                                       | Optional, an integer greater than or equal to 0, defaults to `0`    |
| `probeTag`                 | The HTML tag used as probe element. Default value is `div`                        | `string`                                                       | Optional, any valid HTML tag, defaults to `div`                     |
| `respectScrollToOnResize`  | Snap to the position set by `scrollTo` when the grid container is resized         | `boolean`                                                      | Optional, defaults to `false`                                       |
| `scrollBehavior`           | The behavior of `scrollTo`. Default value is `smooth`                             | `smooth` &#124; `auto`                                         | Optional, a string to be `smooth` or `auto`, defaults to `smooth`   |
| `scrollTo`                 | Scroll to a specific item by index                                                | `number`                                                       | Optional, an integer from 0 to the `length` prop - 1, defaults to 0 |
| `tag`                      | The HTML tag used as container element. Default value is `div`                    | `string`                                                       | Optional, any valid HTML tag, defaults to `div`                     |
| `getKey`                   | The `:key` used on each grid item. Auto-generated, but overwritable via function  | `(internalItem: InternalItem) => number \| string` <sup>1</sup>| Optional, any valid Function that returns a `string` or `number`    |

Example:

```vue
<Grid
  :length="1000"
  :pageProvider="async (pageNumber, pageSize) => Array(pageSize).fill('x')"
  :pageSize="40"
  :scrollTo="10"
>
<!-- ...slots -->
</Grid>
```

## Available Slots

There are 3 scoped slots: `default`, `placeholder` and `probe`.

### The `default` slot

The `default` slot is used to render a loaded item.

Props:

- `item`: the loaded item that is used for rendering your item
  element/component.
- `index`: the index of current item within the list.
- `style`: the style object provided by the library that need to be set on the
  item element/component.

Example:

```vue
<template v-slot:default="{ item, style, index }">
  <div :style="style">{{ item }} {{ index }}</div>
</template>
```

### The`placeholder` slot

When an item is not loaded, the component/element in the `placeholder` slot will
be used for rendering. The `placeholder` slot is optional. If missing, the space
of unloaded items will be blank until they are loaded.

Props:

- `index`: the index of current item within the list.
- `style`: the style object provided by the library that need to be set on the
  item element/component.

Example:

```vue
<template v-slot:placeholder="{ index, style }">
  <div :style="style">Placeholder {{ index }}</div>
</template>
```

### The `probe` slot

The `probe` slot is used to measure the visual size of grid item. It has no
prop. You can pass the same element/component for the
`placeholder` slot. **If not provided, you must set a fixed height
to `grid-template-rows` on your CSS grid, e.g. `200px`. If provided, make sure
it is styled with the same dimensions as rendered items in the `default`
or `placeholder` slot. Otherwise, the view wouldn't be rendered properly, or the
rendering could be very slow.**

Example:

```vue
<template v-slot:probe>
  <div class="item">Probe</div>
</template>
```

## Exposed Public Properties

* `allItems`: All items memoized by the grid

## Scroll Mode

The library uses `grid-auto-flow` CSS property to infer scroll mode. Set it to
`column` value if you want to enable horizontal scroll.

## Caveats

The library does not require items have foreknown width and height, but do
require them to be styled with the same width and height under a view. E.g. the
items can be 200px x 200px when the view is under 768px and 300px x 500px above
768px.

## Development

Required environment variables:

- `VITE_APP_ID`: An Algolia app ID
- `VITE_SEARCH_ONLY_API_KEY`: The search API key for the Algolia app above

* Setup: `npm install`
* Run dev server: `npm run dev `
* Lint (type check): `npm run lint `
* Build the library: `npm run build `
* Build the demo: `npm run build -- --mode=demo `
* Preview the locally built demo: `npm run serve `

### How to Release a New Version

We use [semantic-release][semantic-release] to release the library on npm
automatically.

[demo]: https://grid.kiwiberry.nz/
[npm]: https://www.npmjs.com/package/vue-virtual-scroll-grid
[esm]: https://codesandbox.io/s/vue-virtual-scroll-grid-esm-vt27c?file=/App.vue
[umd]: https://codesandbox.io/s/vue-virtual-scroll-grid-umd-k14w5?file=/index.html
[semantic-release]: https://semantic-release.gitbook.io/semantic-release/#how-does-it-work

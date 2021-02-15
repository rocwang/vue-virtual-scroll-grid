# Virtual Scroll Grid for Vue 3

[Demo][demo]

This is a reusable component for Vue 3 that renders a list with a huge number of
items (e.g. 1000+ items) as a grid in a performant way.

## Features

- Utilising virtual-scrolling / windowing to render the items while keep the
  number of DOM nodes low.
- Support using a paginated API to provide the items to render.
- Support placeholders for unloaded items, and the loaded items are cached
  for better performance.
- Just use CSS grid to style your grid.

## Available Props

```js
{
    // The number of items in the list.
    length: {
      type: Number as PropType<number>,
      required: true,
    },
    // The callback that returns a page of items as a promise.
    pageProvider: {
      type: Function as PropType<
        (pageNumber: number, pageSize: number) => Promise<unknown[]>
      >,
      required: true,
    },
    // The number of items in a page from the item provider (e.g. a backend API).
    pageSize: {
      type: Number as PropType<number>,
      required: true,
    }
  }
```

## Development

### Setup

```shell
npm install
```

### Spin up the dev server

```shell
npm run dev
```

### Linting (Type Check)

```shell
npm run lint
```

### Build the Library

```shell
npm run build
```

### Build the Demo

```shell
npm run build -- --mode=demo
```

### Preview the Locally Built Demo

```shell
npm run serve
```

[demo]: https://vue-virtual-scroll-grid.netlify.app/

# Virtual Scroll Grid for Vue 3

[Demo][demo]

This is a reusable component for Vue 3 that renders a list with a huge number of
items (e.g. 1000+ items) as a grid in a performant way.

## Features

- Use virtual-scrolling / windowing to render the items, so the number of DOM
  nodes is low.
- Support using a paginated API to load the items in the background.
- Support placeholders for unloaded items and loaded items are cached for
  better performance.
- Just use CSS grid to style your grid. Minimum styling opinions form the
  library.

## Exmaple

```vue
<template>
  <!-- length: The number of items in the list. -->
  <!-- pageSize: The number of items in a page from the item provider (e.g. a backend API). -->
  <!-- pageProvider: The callback that returns a page of items as a promise. -->
  <Grid :length="1000" :pageSize="2" :pageProvider="pageProvider" class="grid">
    <!-- When the item is not loaded, a placeholder is rendered -->
    <template v-slot:placeholder="{ index, style, className }">
      <div :class="[className, 'item']" :style="style">
        Placeholder {{ index }}
      </div>
    </template>

    <!-- Render a loaded item -->
    <template v-slot:default="{ item, style, index, className }">
      <div :class="[className, 'item']" :style="style">
        {{ item }} {{ index }}
      </div>
    </template>
  </Grid>
</template>

<script>
import Grid from "vue-virtual-scroll-grid";

export default {
  name      : "App",
  components: {Grid},
  setup     : () => ({
    // Return items for the given page after a 0-3 second randomly
    pageProvider: (pageNumber, pageSize) =>
      new Promise((resolve) =>
        setTimeout(
          () => resolve(new Array(pageSize).fill("Loaded Item")),
          Math.round(3000 * Math.random())
        )
      ),
  }),
};
</script>

<style>
@import "vue-virtual-scroll-grid/dist/style.css";

body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.grid {
  display: grid;
  grid-gap: 20px;
  grid-template-rows: 200px;
  grid-template-columns: repeat(2, 1fr);
  place-items: strech;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 992px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1440px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1650px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 1890px) {
  .grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

@media (min-width: 2530px) {
  .grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

.item {
  box-sizing: border-box;
  border: 1px solid black;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
}
</style>
```

## Available Props

```ts
interface Props {
  // The number of items in the list.
  length: number;
  // The callback that returns a page of items as a promise.
  pageProvider: (pageNumber: number, pageSize: number) => Promise<unknown[]>
  // The number of items in a page from the item provider (e.g. a backend API).
  pageSize: number;
}
```

## Development

- Setup `npm install`
- Run dev server `shell npm run dev `
- Lint (type check) `shell npm run lint `
- Build the library `shell npm run build `
- Build the demo `shell npm run build -- --mode=demo `
- Preview the locally built demo `shell npm run serve `

[demo]: https://vue-virtual-scroll-grid.netlify.app/

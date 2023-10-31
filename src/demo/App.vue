<template>
  <div :class="$style.root">
    <Header :class="$style.header" />

    <div :class="$style.gridWrapper">
      <Grid
        ref="grid"
        :length="length"
        :pageSize="pageSize"
        :pageProvider="pageProvider"
        :pageProviderDebounceTime="0"
        :scrollTo="scrollTo"
        :scrollBehavior="scrollBehavior"
        :respectScrollToOnResize="respectScrollToOnResize"
        :class="[$style.grid, $style[scrollMode]]"
      >
        <template v-slot:probe>
          <ProductItem sizes="(min-width: 768px) 360px, 290px" />
        </template>

        <template v-slot:placeholder="{ style }">
          <ProductItem :style="style" sizes="(min-width: 768px) 360px, 290px" />
        </template>

        <template v-slot:default="{ item, style }">
          <ProductItem
            :handle="item.handle"
            :price="item.price * 100"
            :compare-at-price="item.compare_at_price * 100"
            :published-at="new Date(item.published_at)"
            :style="style"
            :master-src="item.product_image"
            :initial-alt-master-src="true"
            :alt="item.title"
            sizes="(min-width: 768px) 360px, 290px"
            :tags="item.tags"
            :vendor="item.vendor"
            :title="item.title"
          />
        </template>
      </Grid>
    </div>

    <Control :class="$style.controls" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import Grid from "../Grid.vue";
import Header from "./Header.vue";
import Control from "./Control.vue";
import ProductItem from "./ProductItem.vue";
import {
  length,
  pageSize,
  pageProvider,
  scrollMode,
  scrollTo,
  scrollBehavior,
  respectScrollToOnResize,
} from "./store";

export default defineComponent({
  name: "App",
  components: { Grid, ProductItem, Header, Control },
  setup: () => {
    const grid = ref(null);

    return {
      grid,
      length,
      pageSize,
      pageProvider,
      scrollMode,
      scrollTo,
      scrollBehavior,
      respectScrollToOnResize,
    };
  },
});
</script>

<style module>
:root {
  --color-black: #1a1919;
  --color-white: #fff;

  --color-light-gray: #eee;
  --color-gray: #b9b9b9;

  --color-rice: #f8f8f3;
  --color-dark-rice: #727266;

  --color-light-red: #f2e5e5;
  --color-red: #9c8282;

  --color-light-green: #ecf2e5;
  --color-green: #909c82;
}

body {
  color: var(--color-black);
  background-color: var(--color-white);
}

.root {
  display: grid;
  grid-template: "header" "gridWrapper" 1fr "controls";
  height: 100vh;
}

.header {
  grid-area: header;
}

.gridWrapper {
  grid-area: gridWrapper;
  height: 100%;
  overflow: auto;
}

.controls {
  grid-area: controls;
}

.grid {
  display: grid;
  padding: 0 1rem;
  grid-gap: 2rem;
  place-items: start stretch;
  box-sizing: content-box;
}

.grid.vertical {
  grid-template-columns: repeat(2, 1fr);
}

.grid.horizontal {
  grid-auto-flow: column;
  grid-template-columns: 200px;
  grid-template-rows: repeat(2, 1fr);
}

@media (min-width: 760px) {
  .grid {
    padding: 1.5rem;
    grid-gap: 3rem;
  }

  .grid.vertical {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1140px) {
  .grid.vertical {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1520px) {
  .grid.vertical {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1900px) {
  .grid.vertical {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 2280px) {
  .grid.vertical {
    grid-template-columns: repeat(7, 1fr);
  }
}

@media (min-width: 2660px) {
  .grid.vertical {
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (min-width: 3040px) {
  .grid.vertical {
    grid-template-columns: repeat(9, 1fr);
  }
}

@media (min-width: 3420px) {
  .grid.vertical {
    grid-template-columns: repeat(10, 1fr);
  }
}

@media (min-height: 721px) {
  .grid.horizontal {
    grid-template-rows: repeat(3, 1fr);
  }
}

@media (min-height: 1081px) {
  .grid.horizontal {
    grid-template-rows: repeat(4, 1fr);
  }
}
</style>

<template>
  <h1 :class="$style.title">
    <a
      href="https://github.com/rocwang/vue-virtual-scroll-grid"
      :class="$style.link"
      target="_blank"
      rel="noreferrer"
    >
      Vue Virtual Scroll Grid
    </a>
  </h1>

  <Grid
    :length="1000"
    :pageSize="40"
    :pageProvider="pageProvider"
    :class="$style.grid"
  >
    <template v-slot:probe>
      <ProductItem sizes="(min-width: 768px) 360px, 290px" />
    </template>

    <template v-slot:placeholder="{ index, style }">
      <ProductItem :style="style" sizes="(min-width: 768px) 360px, 290px" />
    </template>

    <template v-slot:default="{ item, style }">
      <ProductItem
        :handle="item.handle"
        :price="item.price * 100"
        :compare-at-price="item.compare_at_price * 100"
        :published-at="new Date(item.published_at)"
        :class="bem('item')"
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
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Grid from "../Grid.vue";
import ProductItem from "./ProductItem.vue";
import algoliasearch from "algoliasearch";
import { prop } from "ramda";

export default defineComponent({
  name: "App",
  components: { Grid, ProductItem },
  setup: () => ({
    pageProvider: (pageNumber: number, pageSize: number): Promise<Object[]> =>
      algoliasearch(
        import.meta.env.VITE_APP_ID,
        import.meta.env.VITE_SEARCH_ONLY_API_KEK
      )
        .initIndex("shopify_products")
        .search("", {
          distinct: true,
          hitsPerPage: pageSize,
          page: pageNumber,
        })
        .then(prop("hits")),
  }),
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
  padding: 2rem 0;
}

@media (min-width: 768px) {
  body {
    padding: 1.5rem;
  }
}

.title {
  font-size: 4rem;
  text-align: center;
  margin: 0 2rem 3rem;
}

.link {
  text-decoration: underline;
}

.grid {
  display: grid;
  grid-gap: 1rem;
  grid-template-columns: repeat(2, 1fr);
  place-items: start stretch;
}

@media (min-width: 760px) {
  .grid {
    grid-gap: 3rem;
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1140px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1520px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1900px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 2280px) {
  .grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

@media (min-width: 2660px) {
  .grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (min-width: 3040px) {
  .grid {
    grid-template-columns: repeat(9, 1fr);
  }
}

@media (min-width: 3420px) {
  .grid {
    grid-template-columns: repeat(10, 1fr);
  }
}
</style>

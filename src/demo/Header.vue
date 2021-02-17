<template>
  <header :class="$style.header">
    <h1 :class="$style.title">Vue Virtual Scroll Grid</h1>

    <div :class="$style.controlGroup">
      <label for="length">Number of Items: {{ length }}</label>
      <input
        type="range"
        id="length"
        min="0"
        max="1000"
        step="10"
        v-model.number="length"
      />
    </div>

    <div :class="$style.controlGroup">
      <label for="pageSize">Number of Items Per Page: {{ pageSize }}</label>
      <input
        type="range"
        id="pageSize"
        min="1"
        max="100"
        v-model.number="pageSize"
      />
    </div>

    <div :class="$style.controlGroup">
      <input type="radio" id="all" value="" v-model="collection" />
      <label for="all">All</label>

      <input type="radio" id="mens" value="all-mens" v-model="collection" />
      <label for="mens">Mens</label>

      <input
        type="radio"
        id="womens"
        value="womens-view-all"
        v-model="collection"
      />
      <label for="womens">Womens</label>
    </div>

    <a
      href="https://github.com/rocwang/vue-virtual-scroll-grid#readme"
      target="_blank"
      rel="noreferrer"
    >
      Docs
    </a>
  </header>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { length, pageSize, collection } from "./store";

export default defineComponent({
  name: "Header",
  setup: () => {
    return { length, pageSize, collection };
  },
});
</script>

<style module>
.header {
  padding: 0 2rem 3rem;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-rice);
  border-bottom: 1px solid var(--color-black);
}

.title {
  font-size: 4rem;
}
</style>

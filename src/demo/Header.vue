<template>
  <header :class="$style.root">
    <h1 :class="$style.title">Vue Virtual Scroll Grid</h1>

    <div :class="$style.links">
      <a
        href="https://github.com/rocwang/vue-virtual-scroll-grid#readme"
        target="_blank"
        rel="noreferrer"
      >
        Docs
      </a>
      <a
        href="https://github.com/rocwang/vue-virtual-scroll-grid"
        target="_blank"
        rel="noreferrer"
      >
        Github
      </a>
      <a
        href="https://www.npmjs.com/package/vue-virtual-scroll-grid"
        target="_blank"
        rel="noreferrer"
      >
        NPM
      </a>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "Header",
});
</script>

<style module>
.root {
  background-color: var(--color-rice);
  padding: 1.5rem;
  display: grid;
  grid-template:
    "title title" auto
    "links links" auto
    / 1fr 1fr;
  place-items: center stretch;
  grid-gap: 1.5rem;
  border-bottom: 2px solid var(--color-black);
}

.title {
  font-size: 2rem;
  font-weight: 700;
  grid-area: title;
  justify-self: center;
}

.links {
  display: flex;
  grid-area: links;
  flex-flow: row nowrap;
  justify-content: space-around;
  align-items: center;
  text-decoration: underline;
}

@media (min-width: 760px) {
  .root {
    grid-template:
      "title links" auto
      / 1fr 200px;
  }

  .title {
    justify-self: start;
  }

  .links {
    justify-content: space-between;
  }
}
</style>

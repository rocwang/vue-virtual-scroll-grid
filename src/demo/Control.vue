<template>
  <div :class="$style.root">
    <div :class="$style.length">
      <label for="length" :class="$style.label">
        Item Count: {{ length }}
      </label>
      <input
        type="range"
        id="length"
        min="0"
        max="1000"
        step="10"
        v-model.number="length"
        :class="$style.range"
      />
    </div>

    <div :class="$style.pageSize">
      <label for="pageSize" :class="$style.label">
        Items Per Page: {{ pageSize }}
      </label>
      <input
        type="range"
        id="pageSize"
        min="1"
        max="100"
        v-model.number="pageSize"
        :class="$style.range"
      />
    </div>

    <div :class="$style.pageProvider">
      <p :class="$style.category">Category:</p>

      <div :class="$style.radioList">
        <label for="all" :class="$style.radioLabel">
          <input
            type="radio"
            id="all"
            value=""
            v-model="collection"
            :class="$style.radio"
          />
          All
        </label>

        <label for="mens" :class="$style.radioLabel">
          <input
            type="radio"
            id="mens"
            value="all-mens"
            v-model="collection"
            :class="$style.radio"
          />
          Mens
        </label>

        <label for="womens" :class="$style.radioLabel">
          <input
            type="radio"
            id="womens"
            value="womens-view-all"
            v-model="collection"
            :class="$style.radio"
          />
          Womens
        </label>
      </div>
    </div>

    <div :class="$style.scrollTo">
      <label for="pageSize" :class="$style.label"> Scroll To: </label>
      <input
        type="number"
        id="scrollTo"
        min="0"
        max="1000"
        v-model.number="scrollTo"
        :class="$style.number"
      />
    </div>

    <div :class="$style.scrollBehavior">
      <p :class="$style.category">Scroll Behavior:</p>

      <div :class="$style.radioList">
        <label for="smooth" :class="$style.radioLabel">
          <input
            type="radio"
            id="smooth"
            value="smooth"
            v-model="scrollBehavior"
            :class="$style.radio"
          />
          Smooth
        </label>

        <label for="auto" :class="$style.radioLabel">
          <input
            type="radio"
            id="auto"
            value="auto"
            v-model="scrollBehavior"
            :class="$style.radio"
          />
          Auto
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  collection,
  length,
  pageSize,
  scrollTo,
  scrollBehavior,
} from "./store";

export default defineComponent({
  name: "Control",
  setup: () => {
    return { length, pageSize, collection, scrollTo, scrollBehavior };
  },
});
</script>

<style module>
.root {
  padding: 1.5rem;
  position: sticky;
  bottom: 0;
  width: 100%;
  z-index: 10;
  background-color: var(--color-rice);
  border-top: 2px solid var(--color-black);

  display: grid;
  grid-template:
    "length pageProvider" auto
    "pageSize pageProvider" auto
    "scrollTo pageProvider" auto
    "scrollBehavior pageProvider" auto
    / 2fr 1fr;
  place-items: center stretch;
  grid-gap: 1.5rem;
}

.length {
  grid-area: length;
}

.pageSize {
  grid-area: pageSize;
}

.pageProvider {
  grid-area: pageProvider;
  place-self: stretch;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.scrollTo {
  grid-area: scrollTo;
}

.scrollBehavior {
  grid-area: scrollBehavior;
  place-self: stretch;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.radioList {
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
}

.length {
  grid-area: length;
}

.radio {
  display: inline;
}

.radioLabel {
  display: inline;
}

.range {
  width: 100%;
}

.number {
  background-color: var(--color-rice);
  width: 100%;
  border: 1px solid var(--color-black);
  padding: 5px;
  font-size: 1.4rem;
  color: var(--color-black);
}

.label {
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.category {
  font-weight: 700;
  margin-bottom: 1rem;
}

@media (min-width: 760px) {
  .root {
    grid-template:
      "length pageSize pageProvider scrollTo scrollBehavior" auto
      / 2fr 2fr 2fr 1fr 1fr;
  }

  .category {
    margin-bottom: 0.5rem;
  }

  .radioList {
    flex-direction: row;
    justify-content: flex-start;
  }

  .radioLabel {
    margin-right: 2rem;
  }
}
</style>

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

    <div :class="$style.scrollMode">
      <p :class="$style.category">Scroll mode:</p>

      <div :class="$style.radioList">
        <label for="vertical" :class="$style.radioLabel">
          <input
            type="radio"
            id="vertical"
            value="vertical"
            v-model="scrollMode"
            :class="$style.radio"
          />
          Vertical
        </label>

        <label for="horizontal" :class="$style.radioLabel">
          <input
            type="radio"
            id="horizontal"
            value="horizontal"
            v-model="scrollMode"
            :class="$style.radio"
          />
          Horizontal
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

    <div :class="$style.respectScrollToOnResize">
      <label for="respectScrollToOnResize" :class="$style.radioLabel">
        <input
          type="checkbox"
          id="respectScrollToOnResize"
          v-model="respectScrollToOnResize"
          :class="$style.radio"
        />
        Snap to "Scroll To" on resizing
      </label>
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
  scrollMode,
  scrollTo,
  scrollBehavior,
  respectScrollToOnResize,
} from "./store";

export default defineComponent({
  name: "Control",
  setup: () => {
    return {
      length,
      pageSize,
      collection,
      scrollMode,
      scrollTo,
      scrollBehavior,
      respectScrollToOnResize,
    };
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
    "length pageSize" auto
    "pageProvider scrollTo" auto
    "scrollMode scrollBehavior" auto
    "respectScrollTo respectScrollTo" auto
    / 1fr 1fr;
  place-items: start;
  grid-gap: 1rem;
}

.length {
  grid-area: length;
  justify-self: stretch;
}

.pageSize {
  grid-area: pageSize;
  justify-self: stretch;
}

.pageProvider {
  grid-area: pageProvider;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.scrollMode {
  grid-area: scrollMode;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.scrollTo {
  grid-area: scrollTo;
}

.scrollBehavior {
  grid-area: scrollBehavior;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.respectScrollToOnResize {
  grid-area: respectScrollTo;
}

.radioList {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
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
  margin-right: 1rem;
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
      "length pageSize pageProvider scrollMode scrollTo respectScrollTo scrollBehavior" auto
      / 3fr 3fr 3fr 3fr 1fr 3fr 2fr;
    grid-gap: 1.5rem;
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

  .respectScrollToOnResize {
    place-self: center;
  }
}
</style>

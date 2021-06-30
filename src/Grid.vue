<template>
  <div
    v-show="length > 0"
    ref="rootRef"
    :style="{
      height: `${contentHeight}px`,
      placeContent: 'start',
    }"
  >
    <div
      :style="{
        opacity: 0,
        visibility: 'hidden',
        gridArea: '1/1',
        pointerEvents: 'none',
        zIndex: -1,
        placeSelf: 'stretch',
      }"
      ref="probeRef"
    >
      <slot name="probe" />
    </div>

    <template v-for="(internalItem, index) in buffer" :key="index">
      <slot
        v-if="internalItem.value === undefined"
        name="placeholder"
        :index="internalItem.index"
        :style="internalItem.style"
      />
      <slot
        v-else
        name="default"
        :item="internalItem.value"
        :index="internalItem.index"
        :style="internalItem.style"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onUpdated, PropType, ref } from "vue";
import {
  fromProp,
  fromResizeObserver,
  fromWindowScroll,
  useObservable,
} from "./utilites";
import { PageProvider, pipeline } from "./pipeline";
import { once } from "ramda";

export default defineComponent({
  name: "Grid",
  props: {
    // The number of items in the list.
    length: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value) && value >= 0,
    },
    // The callback that returns a page of items as a promise.
    pageProvider: {
      type: Function as PropType<PageProvider>,
      required: true,
    },
    // The number of items in a page from the item provider (e.g. a backend API).
    pageSize: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value) && value >= 1,
    },
    // Scroll to a specific item by index, must be less than the length prop
    scrollTo: {
      type: Number as PropType<number>,
      required: false,
      validator: (value: number) => Number.isInteger(value) && value >= 0,
    },
  },
  setup(props) {
    // template refs
    const rootRef = ref<Element>();
    const probeRef = ref<Element>();

    // data to render
    const {
      buffer$, // the items in the current scanning window
      contentHeight$, // the height of the whole list
      windowScrollTo$, // the value sent to window.scrollTo()
    } = pipeline({
      // streams of prop
      length$: fromProp(props, "length"),
      pageProvider$: fromProp(props, "pageProvider"),
      pageSize$: fromProp(props, "pageSize"),
      // a stream of item size measurements when it is changed
      itemRect$: fromResizeObserver(probeRef, "contentRect"),
      // a stream of root elements when it is resized
      rootResize$: fromResizeObserver(rootRef, "target"),
      // a stream of root elements when scrolling
      scroll$: fromWindowScroll(rootRef),
      scrollTo$: fromProp(props, "scrollTo"),
    });

    onUpdated(
      once(() => {
        windowScrollTo$.subscribe((next) => {
          window.scrollTo({ top: next, behavior: "smooth" });
        });
      })
    );

    return {
      rootRef,
      probeRef,
      buffer: useObservable(buffer$),
      contentHeight: useObservable(contentHeight$),
    };
  },
});
</script>

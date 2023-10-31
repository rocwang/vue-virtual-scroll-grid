<template>
  <component :is="tag" v-show="length > 0" ref="rootRef" :style="rootStyles">
    <component
      :is="probeTag"
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
    </component>

    <template
      v-for="internalItem in buffer"
      :key="
        getKey ? getKey(internalItem) : keyPrefix + '.' + internalItem.index
      "
    >
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
  </component>
</template>

<script lang="ts">
import {
  defineComponent,
  onUpdated,
  PropType,
  ref,
  computed,
  watch,
  StyleValue,
} from "vue";
import {
  fromProp,
  fromResizeObserver,
  fromScrollParent,
  useObservable,
} from "./utilites";
import { InternalItem, PageProvider, pipeline, ScrollAction } from "./pipeline";
import { once } from "ramda";
import { VueInstance } from "@vueuse/core";

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
    // Debounce window in milliseconds on the calls to `pageProvider`,
    // which is useful for avoiding network requests of skimmed pages.
    pageProviderDebounceTime: {
      type: Number as PropType<number>,
      required: false,
      default: 0,
      validator: (value: number) => Number.isInteger(value) && value >= 0,
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
    // Snap to `scrollTo` when the grid container is resized
    respectScrollToOnResize: {
      type: Boolean as PropType<boolean>,
      required: false,
      default: true,
    },
    scrollBehavior: {
      type: String as PropType<"smooth" | "auto">,
      required: false,
      default: "smooth",
      validator: (value: string) => ["smooth", "auto"].includes(value),
    },
    tag: {
      type: String as PropType<string>,
      required: false,
      default: "div",
    },
    probeTag: {
      type: String as PropType<string>,
      required: false,
      default: "div",
    },
    getKey: {
      type: Function as PropType<
        (internalItem: InternalItem) => number | string
      >,
      required: false,
      default: undefined,
    },
  },
  setup(props, { expose }) {
    // template refs
    const rootRef = ref<HTMLElement | SVGElement | VueInstance>();
    const probeRef = ref<HTMLElement | SVGElement | VueInstance>();

    // data to render
    const {
      buffer$, // the items in the current scanning window
      contentSize$, // the size of the whole list
      scrollAction$, // the value sent to window.scrollTo()
      allItems$, // all items memoized by the grid
    } = pipeline({
      // streams of prop
      length$: fromProp(props, "length"),
      pageProvider$: fromProp(props, "pageProvider"),
      pageProviderDebounceTime$: fromProp(props, "pageProviderDebounceTime"),
      pageSize$: fromProp(props, "pageSize"),
      // a stream of item size measurements when it is changed
      itemRect$: fromResizeObserver(probeRef, "contentRect"),
      // a stream of root elements when it is resized
      rootResize$: fromResizeObserver(rootRef, "target"),
      // a stream of root elements when scrolling
      scroll$: fromScrollParent(rootRef),
      respectScrollToOnResize$: fromProp(props, "respectScrollToOnResize"),
      scrollTo$: fromProp(props, "scrollTo"),
    });

    onUpdated(
      once(() => {
        scrollAction$.subscribe(({ target, top, left }: ScrollAction) => {
          target.scrollTo({ top, left, behavior: props.scrollBehavior });
        });
      }),
    );

    const contentSize = useObservable(contentSize$);
    const rootStyles = computed<StyleValue>(() =>
      Object.fromEntries([
        ...Object.entries(contentSize.value ?? {}).map(([property, value]) => [
          property,
          value + "px",
        ]),
        ["placeContent", "start"],
      ]),
    );

    const keyPrefix = ref<string>("");
    watch(
      () => props.pageProvider,
      () => (keyPrefix.value = String(new Date().getTime())),
      { immediate: true },
    );

    const allItems = useObservable(allItems$);
    expose({ allItems });

    return {
      rootRef,
      probeRef,
      buffer: useObservable(buffer$),
      rootStyles,
      keyPrefix,
    };
  },
});
</script>

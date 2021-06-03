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
import { defineComponent, onMounted, PropType, ref } from "vue";
import { fromEvent, fromEventPattern, Observable } from "rxjs";
import { pluck, share, switchMapTo } from "rxjs/operators";
import { useObservable } from "@vueuse/rxjs";
import { fromProp, fromResizeObserver} from "./utilites";
import {InternalItem, PageProvider, pipeline} from "./pipeline";

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
  },
  setup(props) {
    // region: props
    const length$ = fromProp<number>("length", props);
    const pageSize$ = fromProp<number>("pageSize", props);
    const pageProvider$ = fromProp<PageProvider>("pageProvider", props);
    // endregion

    // region: refs
    const rootRef = ref<HTMLElement>(document.createElement("div"));
    const probeRef = ref<HTMLElement>(document.createElement("div"));
    // endregion

    // region: rendering triggers
    // a stream of root elements when scrolling
    const scroll$: Observable<HTMLElement> = fromEventPattern(onMounted).pipe(
      // use share() to push the "mounted" event from vue, instead of pulling:
      share(),
      switchMapTo(
        fromEvent<UIEvent, HTMLElement>(
          window,
          "scroll",
          {
            passive: true,
            capture: true,
          },
          () => rootRef.value
        )
      )
    );

    // a stream of root elements when it is resized
    const rootResize$: Observable<Element> = fromResizeObserver(rootRef).pipe(
      pluck("target")
    );

    // a stream of item size measurements when it is changed
    const itemRect$: Observable<DOMRectReadOnly> = fromResizeObserver(
      probeRef
    ).pipe(pluck("contentRect"));
    // endregion

    // region: data to render
    const [
      buffer$, // the items in the current scanning window
      contentHeight$, // the height of the whole list
    ] = pipeline(
      itemRect$,
      length$,
      pageProvider$,
      pageSize$,
      rootResize$,
      scroll$
    )
    const buffer = useObservable<InternalItem[]>(buffer$)
    const contentHeight = useObservable<number>(contentHeight$)
    // endregion

    return { rootRef, probeRef, buffer, contentHeight };
  },
});
</script>

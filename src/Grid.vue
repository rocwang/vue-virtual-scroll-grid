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
import { defineComponent, onMounted, PropType, ref, Ref } from "vue";
import { fromEvent, fromEventPattern, Observable } from "rxjs";
import { mapTo, pluck, share, switchMap } from "rxjs/operators";
import { useObservable } from "@vueuse/rxjs";
import { fromProp, fromResizeObserver, PageProvider } from "./utilites";
import { pipeline } from "./pipeline";

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

    // region: rendering trigger streams
    const rootRef = ref<HTMLElement>(document.createElement("div"));
    const probeRef = ref<HTMLElement>(document.createElement("div"));

    const mounted$: Observable<{
      rootRef: Ref<HTMLElement>;
      probeRef: Ref<HTMLElement>;
    }> = fromEventPattern(onMounted).pipe(
      mapTo({ rootRef, probeRef }),
      share()
    );

    const scroll$: Observable<HTMLElement> = mounted$.pipe(
      switchMap(({ rootRef }) =>
        fromEvent<UIEvent>(window, "scroll", {
          passive: true,
          capture: true,
        }).pipe(mapTo(rootRef.value))
      )
    );

    const rootResize$: Observable<Element> = fromResizeObserver(rootRef).pipe(
      pluck("target")
    );

    const itemRect$: Observable<DOMRectReadOnly> = fromResizeObserver(
      probeRef
    ).pipe(pluck("contentRect"));
    // endregion

    const [buffer, contentHeight] = pipeline(
      itemRect$,
      length$,
      pageProvider$,
      pageSize$,
      rootResize$,
      scroll$
    ).map(useObservable);

    return {
      // refs
      rootRef,
      probeRef,

      // data to render
      buffer,
      contentHeight,
    };
  },
});
// endregion
</script>

<template>
  <div
    v-if="items.length > 0"
    ref="root"
    :class="$style.root"
    :style="{ height: `${contentHeight}px` }"
  >
    <div ref="grid" v-bind="$attrs">
      <div :class="$style.probe" ref="probe">Probe</div>

      <template v-for="(hit, index) in buffer" :key="index">
        <slot :style="hit.style" :hit="hit" />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, PropType, ref } from "vue";
import {
  combineLatest,
  merge,
  fromEvent,
  Subscription,
  Observable,
} from "rxjs";
import { map, scan, startWith } from "rxjs/operators";
import { useObservable } from "@vueuse/rxjs";

declare interface BufferItem {
  localIndex: number;
  payload: any;
  style?: { transform: string };
}

export default defineComponent({
  name: "Grid",
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<BufferItem[]>,
      required: true,
    },
  },
  setup(props) {
    // region: measure on the visual grid
    const root = ref<HTMLElement>(document.createElement("div"));
    const grid = ref<HTMLElement>(document.createElement("div"));
    const probe = ref<HTMLElement>(document.createElement("div"));

    const resize$ = fromEvent(window, "resize", {
      passive: true,
    }).pipe(startWith(null));

    const scroll$ = fromEvent(window, "scroll", {
      passive: true,
      capture: true,
    });

    const heightAboveWindow$: Observable<number> = merge(resize$, scroll$).pipe(
      map((): number => {
        const boundingBox = root.value.getBoundingClientRect();

        return Math.abs(Math.min(boundingBox.top, 0));
      })
    );

    const resizeMeasure$ = resize$.pipe(
      map((): {
        containerHeight: number;
        colGap: number;
        rowGap: number;
        columns: number;
        itemHeightWithGap: number;
        itemWidthWithGap: number;
      } => {
        const colGap = parseInt(
          window
            .getComputedStyle(grid.value)
            .getPropertyValue("grid-column-gap")
        );
        const rowGap = parseInt(
          window.getComputedStyle(grid.value).getPropertyValue("grid-row-gap")
        );

        return {
          containerHeight: window.innerHeight,
          rowGap,
          columns: window
            .getComputedStyle(grid.value)
            .getPropertyValue("grid-template-columns")
            .split(" ").length,
          itemHeightWithGap: probe.value.offsetHeight + rowGap,
          itemWidthWithGap: probe.value.offsetWidth + colGap,
        };
      })
    );
    // endregion

    const measure$ = combineLatest([heightAboveWindow$, resizeMeasure$]).pipe(
      map(([heightAboveWindow, item]) => ({ heightAboveWindow, ...item }))
    );

    const contentHeight$ = measure$.pipe(
      map(
        ({ columns, rowGap, itemHeightWithGap }) =>
          itemHeightWithGap * Math.ceil(props.items.length / columns) - rowGap
      )
    );

    const buffer$ = measure$.pipe(
      map(
        ({
          heightAboveWindow,
          containerHeight,
          columns,
          rowGap,
          itemWidthWithGap,
          itemHeightWithGap,
        }) => {
          const rowsInView =
            itemHeightWithGap &&
            Math.ceil((containerHeight + rowGap) / itemHeightWithGap) + 1;
          const length = rowsInView * columns;

          const rowsBeforeView =
            itemHeightWithGap &&
            Math.floor((heightAboveWindow + rowGap) / itemHeightWithGap);
          const offset = rowsBeforeView * columns;
          const bufferedOffset = Math.max(offset - Math.floor(length / 2), 0);

          const bufferedLength = Math.min(length * 2, props.items.length);

          return {
            bufferedOffset,
            bufferedLength,
            columns,
            itemWidthWithGap,
            itemHeightWithGap,
          };
        }
      ),
      scan(
        (
          { buffer },
          {
            bufferedOffset,
            bufferedLength,
            columns,
            itemWidthWithGap,
            itemHeightWithGap,
          }
        ) => {
          const visibleItems = props.items.slice(
            bufferedOffset,
            Math.min(bufferedOffset + bufferedLength, props.items.length)
          );
          const itemsToRender = visibleItems.filter(
            (item) => !buffer.includes(item)
          );
          const freeSlotIndices = buffer.reduce(
            (freeSlots, renderedItem, index) => {
              if (!visibleItems.includes(renderedItem)) {
                freeSlots.push(index);
              }
              return freeSlots;
            },
            []
          );

          // update the rendering buffer
          const updateCount = Math.max(
            itemsToRender.length,
            freeSlotIndices.length
          );
          for (let i = 0; i < updateCount; i++) {
            const slot = freeSlotIndices.pop();
            const item = itemsToRender.pop();
            if (slot >= 0 && item) {
              // replace
              buffer[slot] = item;
            } else if (slot >= 0 && !item) {
              // remove the extra free buffer
              buffer.splice(slot, 1);
            } else if (slot === undefined && item) {
              // insert
              buffer.push(item);
            }
          }

          return {
            buffer,
            columns,
            itemWidthWithGap,
            itemHeightWithGap,
          };
        },
        { buffer: [] }
      ),
      map(
        ({
          buffer,
          columns,
          itemWidthWithGap,
          itemHeightWithGap,
        }): BufferItem[] =>
          buffer.map((item) => {
            const x = (item.localIndex % columns) * itemWidthWithGap;
            const y = Math.floor(item.localIndex / columns) * itemHeightWithGap;

            return {
              ...item,
              style: { transform: `translate(${x}px, ${y}px)` },
            };
          })
      )
    );

    const buffer = ref<BufferItem[]>([]);
    const contentHeight = ref<number>(window.outerHeight);
    let bufferSub: Subscription;
    let contentHeightSub: Subscription;
    onMounted(() => {
      contentHeightSub = contentHeight$.subscribe(
        (contentHeightValue) => (contentHeight.value = contentHeightValue)
      );

      bufferSub = buffer$.subscribe(
        (bufferValue) => (buffer.value = bufferValue)
      );
    });
    onUnmounted(() => {
      bufferSub.unsubscribe();
      contentHeightSub.unsubscribe();
    });

    return {
      // refs
      root,
      grid,
      probe,

      // data to render
      buffer,
      contentHeight,
    };
  },
});
</script>

<style module>
.root {
  min-height: 100%;
  overflow: hidden;
}

.probe {
  /*opacity: 0;*/
  /*visibility: hidden;*/
  grid-area: 1/1;
  pointer-events: none;
  z-index: -1;
  place-self: stretch;
  background-color: lightgray;
}
</style>

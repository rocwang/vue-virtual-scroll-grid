<template>
  <div
    v-if="items.length > 0"
    ref="root"
    :class="$style.root"
    :style="{ height: `${contentHeight}px` }"
  >
    <div ref="grid" v-bind="$attrs">
      <div :class="$style.probe" ref="probe">Probe</div>

      <template v-for="(internalItem, index) in buffer" :key="index">
        <slot
          :item="internalItem.value"
          :index="internalItem.index"
          :style="internalItem.style"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref, toRefs } from "vue";
import {
  combineLatest,
  merge,
  fromEvent,
  fromEventPattern,
  Observable,
} from "rxjs";
import { map, scan, startWith } from "rxjs/operators";
import { useObservable, from } from "@vueuse/rxjs";
import {
  T,
  __,
  always,
  concat,
  cond,
  differenceWith,
  identical,
  identity,
  includes,
  map as ramdaMap,
  pipe,
  reject,
  zip,
} from "ramda";
import { isUndefined } from "ramda-adjunct";

declare interface InternalItem {
  index: number;
  value: any;
  style?: { transform: string };
}

export default defineComponent({
  name: "Grid",
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<any[]>,
      required: true,
    },
  },
  setup(props, { attrs }) {
    // region: rendering trigger streams

    // todo: on css changes

    // on items change
    const { items } = toRefs(props);
    const items$: Observable<InternalItem[]> = from(items).pipe(
      startWith(items.value),
      map((items) => items.map((value, index) => ({ index, value })))
    );

    // on resize
    const resize$ = fromEvent<UIEvent>(window, "resize", {
      passive: true,
    });

    // on scroll
    const scroll$ = fromEvent<UIEvent>(window, "scroll", {
      passive: true,
      capture: true,
    });

    // on mounted
    const mount$ = fromEventPattern<undefined>((handler) => onMounted(handler));
    // endregion

    // region: measure on the visual grid
    const root = ref<HTMLElement>(document.createElement("div"));
    const grid = ref<HTMLElement>(document.createElement("div"));
    const probe = ref<HTMLElement>(document.createElement("div"));

    const heightAboveWindow$: Observable<number> = merge(
      mount$,
      resize$,
      scroll$
    ).pipe(
      map(() => Math.abs(Math.min(root.value.getBoundingClientRect().top, 0)))
    );

    const resizeMeasure$: Observable<{
      containerHeight: number;
      rowGap: number;
      columns: number;
      itemHeightWithGap: number;
      itemWidthWithGap: number;
    }> = merge(mount$, resize$).pipe(
      map(() => {
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

    const measure$: Observable<{
      heightAboveWindow: number;
      items: InternalItem[];
      containerHeight: number;
      rowGap: number;
      columns: number;
      itemHeightWithGap: number;
      itemWidthWithGap: number;
    }> = combineLatest([heightAboveWindow$, resizeMeasure$, items$]).pipe(
      map(([heightAboveWindow, resizeMeasure, items]) => ({
        ...resizeMeasure,
        heightAboveWindow,
        items,
      }))
    );

    const contentHeight$: Observable<number> = measure$.pipe(
      map(
        ({ columns, rowGap, itemHeightWithGap, items }) =>
          itemHeightWithGap * Math.ceil(items.length / columns) - rowGap
      )
    );

    const buffer$: Observable<InternalItem[]> = measure$.pipe(
      map(
        ({
          heightAboveWindow,
          containerHeight,
          columns,
          rowGap,
          itemWidthWithGap,
          itemHeightWithGap,
          items,
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
          const bufferedLength = Math.min(length * 2, items.length);

          const visibleItems = items.slice(
            bufferedOffset,
            Math.min(bufferedOffset + bufferedLength, items.length)
          );

          return {
            visibleItems,
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
            visibleItems,
            columns,
            itemWidthWithGap,
            itemHeightWithGap,
          }
        ) => {
          const diffWithIdentical = differenceWith<InternalItem, InternalItem>(
            identical
          );
          const itemsToAdd = diffWithIdentical(visibleItems, buffer);
          const itemsFreeToUse = diffWithIdentical(buffer, visibleItems);

          const replaceMap = new Map(zip(itemsFreeToUse, itemsToAdd));
          const itemsToBeReplaced = [...replaceMap.keys()];
          const itemsToReplaceWith = [...replaceMap.values()];

          const itemsToDelete = diffWithIdentical(
            itemsFreeToUse,
            itemsToBeReplaced
          );
          const itemsToAppend = diffWithIdentical(
            itemsToAdd,
            itemsToReplaceWith
          );

          buffer = pipe(
            ramdaMap<InternalItem, InternalItem | undefined>(
              cond([
                [replaceMap.has.bind(replaceMap), replaceMap.get.bind(replaceMap)],
                [includes(__, itemsToDelete), always(undefined)],
                [T, identity],
              ])
            ),
            reject(isUndefined),
            concat(__, itemsToAppend)
          )(buffer) as InternalItem[];

          return {
            buffer,
            columns,
            itemWidthWithGap,
            itemHeightWithGap,
          };
        },
        {
          buffer: [] as InternalItem[],
          columns: 0,
          itemWidthWithGap: 0,
          itemHeightWithGap: 0,
        }
      ),
      map(
        ({
          buffer,
          columns,
          itemWidthWithGap,
          itemHeightWithGap,
        }): InternalItem[] =>
          buffer.map((item) => {
            const x = (item.index % columns) * itemWidthWithGap;
            const y = Math.floor(item.index / columns) * itemHeightWithGap;

            return {
              ...item,
              style: { transform: `translate(${x}px, ${y}px)` },
            };
          })
      )
    );

    return {
      // refs
      root,
      grid,
      probe,

      // data to render
      buffer: useObservable(buffer$),
      contentHeight: useObservable(contentHeight$),
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

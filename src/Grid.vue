<template>
  <div
    v-if="length > 0"
    ref="root"
    :class="$style.root"
    :style="{ height: `${contentHeight}px` }"
  >
    <div ref="grid" v-bind="$attrs">
      <div :class="$style.probe" ref="probe"></div>

      <template v-for="(internalItem, index) in buffer" :key="index">
        <slot
          v-if="internalItem.value === undefined"
          name="placeholder"
          :index="internalItem.index"
          :style="internalItem.style"
          :className="$style.item"
        />
        <slot
          v-else
          name="default"
          :item="internalItem.value"
          :index="internalItem.index"
          :style="internalItem.style"
          :className="$style.item"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref } from "vue";
import {
  combineLatest,
  fromEvent,
  fromEventPattern,
  merge,
  Observable,
  range,
} from "rxjs";
import {
  distinct,
  distinctUntilChanged,
  map,
  mergeMap,
  scan,
  startWith,
} from "rxjs/operators";
import { from, useObservable } from "@vueuse/rxjs";
import {
  __,
  concat,
  difference,
  identity,
  ifElse,
  map as ramdaMap,
  min,
  pipe,
  without,
  zip,
  remove,
  insertAll,
  slice,
  equals,
} from "ramda";
import { mapIndexed } from "ramda-adjunct";

interface InternalItem {
  index: number;
  value: unknown | undefined;
  style?: { transform: string };
}

export default defineComponent({
  name: "Grid",
  inheritAttrs: false,
  props: {
    length: {
      type: Number as PropType<number>,
      required: true,
    },
    pageProvider: {
      type: Function as PropType<
        (pageNumber: number, pageSize: number) => Promise<unknown[]>
      >,
      required: true,
    },
    pageSize: {
      type: Number as PropType<number>,
      required: true,
    },
  },
  setup(props) {
    // region: rendering trigger streams
    // todo: on css changes
    // todo: on props change

    // on resize
    const resize$ = fromEvent<UIEvent>(window, "resize", { passive: true });

    // on scroll
    const scroll$ = fromEvent<UIEvent>(window, "scroll", {
      passive: true,
      capture: true,
    });

    // on mounted
    const mount$ = fromEventPattern<undefined>(onMounted);
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
      map(() => root.value.getBoundingClientRect().top),
      distinctUntilChanged(),
      map(pipe(min<number>(0), Math.abs))
    );

    const resizeMeasure$: Observable<{
      rowGap: number;
      columns: number;
      itemHeightWithGap: number;
      itemWidthWithGap: number;
    }> = merge(mount$, resize$).pipe(
      map(() => {
        const computedStyle = window.getComputedStyle(grid.value);
        return {
          colGap: parseInt(computedStyle.getPropertyValue("grid-column-gap")),
          rowGap: parseInt(computedStyle.getPropertyValue("grid-row-gap")),
          columns: computedStyle
            .getPropertyValue("grid-template-columns")
            .split(" ").length,
          itemHeight: probe.value.offsetHeight,
          itemWidth: probe.value.offsetWidth,
        };
      }),
      distinctUntilChanged<{
        colGap: number;
        rowGap: number;
        columns: number;
        itemHeight: number;
        itemWidth: number;
      }>(equals),
      map(({ colGap, rowGap, columns, itemHeight, itemWidth }) => ({
        rowGap,
        columns,
        itemHeightWithGap: itemHeight + rowGap,
        itemWidthWithGap: itemWidth + colGap,
      }))
    );
    // endregion

    const contentHeight$: Observable<number> = resizeMeasure$.pipe(
      map(
        ({ columns, rowGap, itemHeightWithGap }) =>
          itemHeightWithGap * Math.ceil(props.length / columns) - rowGap
      )
    );

    const bufferMeta$: Observable<{
      columns: number;
      bufferedOffset: number;
      bufferedLength: number;
      itemWidthWithGap: number;
      itemHeightWithGap: number;
    }> = combineLatest([heightAboveWindow$, resizeMeasure$]).pipe(
      map(
        ([
          heightAboveWindow,
          { columns, rowGap, itemHeightWithGap, itemWidthWithGap },
        ]) => {
          const rowsInView =
            itemHeightWithGap &&
            Math.ceil((window.innerHeight + rowGap) / itemHeightWithGap) + 1;
          const length = rowsInView * columns;

          const rowsBeforeView =
            itemHeightWithGap &&
            Math.floor((heightAboveWindow + rowGap) / itemHeightWithGap);
          const offset = rowsBeforeView * columns;
          const bufferedOffset = Math.max(offset - Math.floor(length / 2), 0);
          const bufferedLength = Math.min(length * 2);

          return {
            columns,
            bufferedOffset,
            bufferedLength,
            itemWidthWithGap,
            itemHeightWithGap,
          };
        }
      ),
      distinctUntilChanged<{
        columns: number;
        bufferedOffset: number;
        bufferedLength: number;
        itemWidthWithGap: number;
        itemHeightWithGap: number;
      }>(equals)
    );

    const allItems$: Observable<unknown[]> = bufferMeta$.pipe(
      mergeMap(({ bufferedOffset, bufferedLength }) => {
        const startPage = Math.floor(bufferedOffset / props.pageSize);
        const endPage = Math.ceil(
          Math.min(bufferedOffset + bufferedLength, props.length) /
            props.pageSize
        );
        const numberOfPages = endPage - startPage;

        return range(startPage, numberOfPages);
      }),
      distinct(),
      mergeMap((pageNumber) =>
        from(props.pageProvider(pageNumber, props.pageSize)).pipe(
          map((items) => ({ pageNumber, items }))
        )
      ),
      scan(
        (allItems, { pageNumber, items }) =>
          pipe<unknown[], unknown[], unknown[]>(
            remove(pageNumber * items.length, items.length),
            insertAll(pageNumber * items.length, items)
          )(allItems),
        new Array(props.length).fill(undefined) as unknown[]
      ),
      startWith(new Array(props.length).fill(undefined) as unknown[])
    );

    const visibleItems$: Observable<InternalItem[]> = combineLatest([
      bufferMeta$,
      allItems$,
    ]).pipe(
      map(
        ([
          {
            columns,
            bufferedOffset,
            bufferedLength,
            itemWidthWithGap,
            itemHeightWithGap,
          },
          allItems,
        ]) =>
          pipe(
            slice(bufferedOffset, bufferedOffset + bufferedLength),
            mapIndexed((value, localIndex) => {
              const index = bufferedOffset + localIndex;
              const x = (index % columns) * itemWidthWithGap;
              const y = Math.floor(index / columns) * itemHeightWithGap;

              return {
                index,
                value,
                style: { transform: `translate(${x}px, ${y}px)` },
              } as InternalItem;
            })
          )(allItems)
      )
    );

    const buffer$: Observable<InternalItem[]> = visibleItems$.pipe(
      scan((buffer: InternalItem[], visibleItems: InternalItem[]) => {
        const itemsToAdd = difference(visibleItems, buffer);
        const itemsFreeToUse = difference(buffer, visibleItems);

        const replaceMap = new Map(zip(itemsFreeToUse, itemsToAdd));
        const itemsToBeReplaced = [...replaceMap.keys()];
        const itemsToReplaceWith = [...replaceMap.values()];

        const itemsToDelete = difference(itemsFreeToUse, itemsToBeReplaced);
        const itemsToAppend = difference(itemsToAdd, itemsToReplaceWith);

        return pipe(
          without(itemsToDelete),
          ramdaMap(
            ifElse(
              replaceMap.has.bind(replaceMap),
              replaceMap.get.bind(replaceMap),
              identity
            )
          ),
          concat(__, itemsToAppend)
        )(buffer);
      }, [])
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
  opacity: 0;
  visibility: hidden;
  grid-area: 1/1;
  pointer-events: none;
  z-index: -1;
  place-self: stretch;
}

.item {
  grid-area: 1/1;
  will-change: transform;
}
</style>

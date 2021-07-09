import {
  filter,
  fromEvent,
  fromEventPattern,
  mergeAll,
  Observable,
  pluck,
} from "rxjs";
import { Ref, ref, watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import {
  MaybeElementRef,
  ResizeObserverEntry,
  tryOnUnmounted,
  unrefElement,
  useResizeObserver,
} from "@vueuse/core";

export function fromProp<T, U extends keyof T>(
  props: T,
  propName: U
): Observable<T[U]> {
  return new Observable((subscriber) =>
    watchEffect(() => subscriber.next(props[propName]))
  );
}

export function fromResizeObserver<T extends keyof ResizeObserverEntry>(
  elRef: MaybeElementRef,
  pluckTarget: T
): Observable<ResizeObserverEntry[T]> {
  return fromEventPattern<ResizeObserverEntry[]>(
    pipe(unary, partial(useResizeObserver, [elRef]))
  ).pipe(mergeAll(), pluck<ResizeObserverEntry, T>(pluckTarget));
}

export function fromWindowScroll(elRef: MaybeElementRef): Observable<Element> {
  return fromEvent(
    window,
    "scroll",
    {
      passive: true,
      capture: true,
    },
    () => unrefElement(elRef)
  ).pipe(
    filter<Element | undefined | null, Element>((el): el is Element =>
      Boolean(el)
    )
  );
}

export function useObservable<H>(observable: Observable<H>): Readonly<Ref<H>> {
  const valueRef = ref<H>();
  const subscription = observable.subscribe((val) => (valueRef.value = val));

  tryOnUnmounted(() => subscription.unsubscribe());

  return valueRef as Readonly<Ref<H>>;
}

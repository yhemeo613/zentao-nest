/** sortablejs 最小子集声明（@types/sortablejs 不在私有镜像源，按本项目用法声明） */
declare module 'sortablejs' {
  export interface SortableOptions {
    group?: string | { name?: string; put?: boolean | string[]; pull?: boolean | string[] };
    sort?: boolean;
    disabled?: boolean;
    animation?: number;
    ghostClass?: string;
    chosenClass?: string;
    dragClass?: string;
    handle?: string;
    draggable?: string;
    onEnd?: (evt: {
      from: HTMLElement;
      to: HTMLElement;
      oldIndex: number | undefined;
      newIndex: number | undefined;
      item: HTMLElement;
    }) => void;
    onAdd?: (evt: { from: HTMLElement; to: HTMLElement; item: HTMLElement }) => void;
  }

  export default class Sortable {
    constructor(el: HTMLElement, options?: SortableOptions);
    destroy(): void;
    option(name: string, value?: unknown): unknown;
    toArray(): string[];
    static create(el: HTMLElement, options?: SortableOptions): Sortable;
  }
}

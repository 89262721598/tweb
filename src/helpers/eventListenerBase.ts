/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

//import { MOUNT_CLASS_TO } from "../config/debug";
import type { ArgumentTypes, SuperReturnType } from "../types";

// class EventSystem {
//   wm: WeakMap<any, Record<any, Set<any>>> = new WeakMap();

//   add(target: any, event: any, listener: any) {
//     let listeners = this.wm.get(target);
//     if (listeners === undefined) {
//         listeners = {};
//     }
//     let listenersForEvent = listeners[event];
//     if (listenersForEvent === undefined) {
//         listenersForEvent = new Set();
//     }
//     listenersForEvent.add(listener);
//     listeners[event] = listenersForEvent;
//     //target.addEventListener(event, listener);
//     this.wm.set(target, listeners);
//   };

//   remove(target: any, event: any, listener: any) {
//     let listeners = this.wm.get(target);
//     if (!listeners) return;
//     let listenersForEvent = listeners[event];
//     if (!listenersForEvent) return;
//     listenersForEvent.delete(listener);
//   };
  
//   /* fire(target, event) {
//      let listeners = this.wm.get(target);
//      if (!listeners) return;
//      let listenersForEvent = listeners[event];
//      if (!listenersForEvent) return;
//      for (let handler of handlers) {
//          setTimeout(handler, 0, event, target); // we use a setTimeout here because we want event triggering to be asynchronous. 
//      }
//   }; */
// }

// console.log = () => {};

// const e = new EventSystem();
// MOUNT_CLASS_TO.e = e;

/**
 * Better not to remove listeners during setting
 * Should add listener callback only once
 */

// type EventLitenerCallback<T> = (data: T) => 
// export default class EventListenerBase<Listeners extends {[name: string]: Function}> {
export default class EventListenerBase<Listeners extends Record<string, Function>> {
  protected listeners: Partial<{
    [k in keyof Listeners]: Array<{callback: Listeners[k], options: boolean | AddEventListenerOptions}>
  }>;
  protected listenerResults: Partial<{
    [k in keyof Listeners]: ArgumentTypes<Listeners[k]>
  }>;

  private reuseResults: boolean;

  constructor(reuseResults?: boolean) {
    this._constructor(reuseResults);
  }

  public _constructor(reuseResults = false): any {
    this.reuseResults = reuseResults;
    this.listeners = {};
    this.listenerResults = {};
  }

  public addEventListener<T extends keyof Listeners>(name: T, callback: Listeners[T], options?: boolean | AddEventListenerOptions) {
    (this.listeners[name] ?? (this.listeners[name] = [])).push({callback, options}); // ! add before because if you don't, you won't be able to delete it from callback

    if(this.listenerResults.hasOwnProperty(name)) {
      callback(...this.listenerResults[name]);
      
      if((options as AddEventListenerOptions)?.once) {
        this.listeners[name].pop();
        return;
      }
    }
    
    //e.add(this, name, {callback, once});
  }

  public addMultipleEventsListeners(obj: {
    [name in keyof Listeners]?: Listeners[name]
  }) {
    for(const i in obj) {
      this.addEventListener(i, obj[i]);
    }
  }

  public removeEventListener<T extends keyof Listeners>(name: T, callback: Listeners[T], options?: boolean | AddEventListenerOptions) {
    if(this.listeners[name]) {
      this.listeners[name].findAndSplice(l => l.callback === callback);
    }
    //e.remove(this, name, callback);
  }

  // * must be protected, but who cares
  private _dispatchEvent<T extends keyof Listeners>(name: T, collectResults: boolean, ...args: ArgumentTypes<Listeners[T]>) {
    if(this.reuseResults) {
      this.listenerResults[name] = args;
    }

    const arr: Array<SuperReturnType<Listeners[typeof name]>> = collectResults && [];

    const listeners = this.listeners[name];
    if(listeners) {
      // ! this one will guarantee execution even if delete another listener during setting
      const left = listeners.slice();
      left.forEach((listener) => {
        const index = listeners.findIndex((l) => l.callback === listener.callback);
        if(index === -1) {
          return;
        }

        let result: any;
        try {
          result = listener.callback(...args);
        } catch(err) {
          
        }

        if(arr) {
          arr.push(result);
        }

        if((listener.options as AddEventListenerOptions)?.once) {
          this.removeEventListener(name, listener.callback);
        }
      });
    }

    return arr;
  }

  public dispatchResultableEvent<T extends keyof Listeners>(name: T, ...args: ArgumentTypes<Listeners[T]>) {
    return this._dispatchEvent(name, true, ...args);
  }

  // * must be protected, but who cares
  public dispatchEvent<T extends keyof Listeners>(name: T, ...args: ArgumentTypes<Listeners[T]>) {
    this._dispatchEvent(name, false, ...args);
  }

  public cleanup() {
    this.listeners = {}; 
    this.listenerResults = {};
  }
}

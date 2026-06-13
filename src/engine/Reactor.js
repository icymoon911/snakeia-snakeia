/*
 * Copyright (C) 2019-2020 Eliastik (eliastiksofts.com)
 *
 * This file is part of "SnakeIA".
 *
 * "SnakeIA" is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * "SnakeIA" is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with "SnakeIA".  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Full-featured event emitter.
 *
 * Public API (new):
 *   on(eventName, callback)          – register a persistent listener
 *   once(eventName, callback)        – register a one-shot listener
 *   off(eventName, callback?)        – remove listener(s); omit callback to remove all
 *   emit(eventName, ...args)         – dispatch the event
 *
 * Legacy API (kept for backward-compatibility):
 *   registerEvent(eventName)         – pre-create the event slot (no-op now, but harmless)
 *   addEventListener(eventName, cb)  – alias for on()
 *   removeEventListener(ev, cb)      – alias for off()
 *   dispatchEvent(eventName, args)   – alias for emit()
 *
 *   reactor.events[eventName].callbacks          – still readable (Array of registered fns)
 *   reactor.events[eventName].registerCallback() – still callable (alias for on)
 */
export default class Reactor {
  constructor() {
    // eventName -> { callbacks: Array, registerCallback(fn) }
    this.events = {};
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Ensure the event slot exists and return it. */
  _ensureEvent(eventName) {
    if (!this.events[eventName]) {
      const listeners = [];

      this.events[eventName] = {
        // Back-compat: expose the raw callbacks array and a registerCallback method.
        callbacks: listeners,
        registerCallback: (cb) => this.on(eventName, cb),
      };
    }

    return this.events[eventName];
  }

  // ---------------------------------------------------------------------------
  // New public API
  // ---------------------------------------------------------------------------

  /**
   * Register a persistent listener for `eventName`.
   * @param {string} eventName
   * @param {Function} callback
   * @returns {this}
   */
  on(eventName, callback) {
    if (typeof callback !== "function") {
      return this;
    }

    this._ensureEvent(eventName);
    const listeners = this.events[eventName].callbacks;

    if (!listeners.includes(callback)) {
      listeners.push(callback);
    }

    return this;
  }

  /**
   * Register a one-shot listener: automatically removed after first invocation.
   * @param {string} eventName
   * @param {Function} callback
   * @returns {this}
   */
  once(eventName, callback) {
    if (typeof callback !== "function") {
      return this;
    }

    const wrapper = (...args) => {
      this.off(eventName, wrapper);
      callback.apply(this, args);
    };

    // Keep a reference so off(eventName, callback) also removes the wrapper.
    wrapper._originalCallback = callback;
    return this.on(eventName, wrapper);
  }

  /**
   * Remove listener(s).
   *  - off(eventName)          → remove ALL listeners for that event
   *  - off(eventName, callback) → remove that specific callback (or its once-wrapper)
   * @param {string} eventName
   * @param {Function} [callback]
   * @returns {this}
   */
  off(eventName, callback) {
    const slot = this.events[eventName];
    if (!slot) return this;

    if (!callback) {
      slot.callbacks.length = 0;
      return this;
    }

    slot.callbacks = slot.callbacks.filter(
      (cb) => cb !== callback && cb._originalCallback !== callback
    );

    return this;
  }

  /**
   * Dispatch the event, calling every registered listener with the supplied arguments.
   * @param {string} eventName
   * @param  {...any} args
   * @returns {this}
   */
  emit(eventName, ...args) {
    const slot = this.events[eventName];
    if (!slot) return this;

    // Iterate over a snapshot so listeners added/removed during dispatch don't interfere.
    const snapshot = slot.callbacks.slice();

    for (let i = 0, l = snapshot.length; i < l; i++) {
      snapshot[i].apply(this, args);
    }

    return this;
  }

  /**
   * Remove every listener for every event.
   * @returns {this}
   */
  removeAllListeners() {
    for (const eventName of Object.keys(this.events)) {
      this.events[eventName].callbacks.length = 0;
    }

    return this;
  }

  /**
   * Return the number of listeners for a given event.
   * @param {string} eventName
   * @returns {number}
   */
  listenerCount(eventName) {
    const slot = this.events[eventName];
    return slot ? slot.callbacks.length : 0;
  }

  // ---------------------------------------------------------------------------
  // Legacy API (backward-compatibility)
  // ---------------------------------------------------------------------------

  /** Pre-create an event slot. Harmless in this implementation but kept for compat. */
  registerEvent(eventName) {
    this._ensureEvent(eventName);
  }

  /** Alias for on(). */
  addEventListener(eventName, callback) {
    return this.on(eventName, callback);
  }

  /** Alias for off(). */
  removeEventListener(eventName, callback) {
    return this.off(eventName, callback);
  }

  /**
   * Alias for emit().
   * The old signature accepted (eventName, eventArgs) – preserve that shape.
   */
  dispatchEvent(eventName, eventArgs) {
    return this.emit(eventName, eventArgs);
  }
}

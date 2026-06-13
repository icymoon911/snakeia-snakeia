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
export default class Event {
  constructor(name) {
    this.name = name;
    this.callbacks = [];
  }

  registerCallback(callback, once = false) {
    if(typeof callback !== "function") return;
    this.callbacks.push({ fn: callback, once });
  }

  unregisterCallback(callback) {
    this.callbacks = this.callbacks.filter(entry => entry.fn !== callback);
  }

  dispatch(eventArgs) {
    const toRemove = [];

    for(let i = 0, l = this.callbacks.length; i < l; i++) {
      const entry = this.callbacks[i];
      entry.fn(eventArgs);

      if(entry.once) {
        toRemove.push(i);
      }
    }

    for(let i = toRemove.length - 1; i >= 0; i--) {
      this.callbacks.splice(toRemove[i], 1);
    }
  }

  clear() {
    this.callbacks = [];
  }

  get listenerCount() {
    return this.callbacks.length;
  }
}

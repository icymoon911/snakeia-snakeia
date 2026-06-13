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
 * Lightweight event descriptor.
 *
 * Retained for backward-compatibility: external code may still import this class
 * and read its `callbacks` array or call `registerCallback(fn)`.
 *
 * For new code, prefer using Reactor directly (on / once / off / emit).
 */
export default class Event {
  constructor(name) {
    this.name = name;
    this.callbacks = [];
  }

  registerCallback(callback) {
    if (typeof callback === "function" && !this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
  }

  removeCallback(callback) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  dispatch(...args) {
    const snapshot = this.callbacks.slice();

    for (let i = 0, l = snapshot.length; i < l; i++) {
      snapshot[i](...args);
    }
  }
}

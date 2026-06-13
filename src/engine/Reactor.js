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
import Event from "./Event.js";

export default class Reactor {
  constructor() {
    this.events = {};
  }

  registerEvent(eventName) {
    if(!this.events[eventName]) {
      this.events[eventName] = new Event(eventName);
    }
  }

  dispatchEvent(eventName, eventArgs) {
    const event = this.events[eventName];

    if(event) {
      event.dispatch(eventArgs);
    }
  }

  addEventListener(eventName, callback) {
    const event = this.events[eventName];

    if(event) {
      event.registerCallback(callback, false);
    }
  }

  once(eventName, callback) {
    const event = this.events[eventName];

    if(event) {
      event.registerCallback(callback, true);
    }
  }

  off(eventName, callback) {
    const event = this.events[eventName];

    if(event) {
      if(callback) {
        event.unregisterCallback(callback);
      } else {
        event.clear();
      }
    }
  }

  removeAllListeners(eventName) {
    if(eventName) {
      const event = this.events[eventName];

      if(event) {
        event.clear();
      }
    } else {
      for(const name of Object.keys(this.events)) {
        this.events[name].clear();
      }
    }
  }

  listenerCount(eventName) {
    const event = this.events[eventName];
    return event ? event.listenerCount : 0;
  }
}

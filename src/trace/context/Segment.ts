/*!
 *
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import Span from '../../trace/Span';
import ID from '../../trace/ID';
import NewID from '../../trace/NewID';
import { emitter } from '../../lib/EventEmitter';

export default class Segment {
  segmentId = new ID();
  spans: Span[] = [];
  relatedTraces: ID[] = [new NewID()];
  referSpanCount: number = 0;

  startSpan(span: Span): number {
    this.spans.push(span);
    this.referSpanCount++;
    return this.spans.length - 1;
  }
  endSpan(span: Span): void {
    this.referSpanCount--;
    if (this.referSpanCount === 0) {
      emitter.emit('segment-finished', this);
    }
  }

  relate(id: ID) {
    if (this.relatedTraces[0] instanceof NewID) {
      this.relatedTraces.shift();
    }
    if (!this.relatedTraces.includes(id)) {
      this.relatedTraces.push(id);
    }
  }

  get traceId(): string {
    return this.relatedTraces[0].toString();
  }
}

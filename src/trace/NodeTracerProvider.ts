/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { TracerProvider, trace, context, propagation } from '@opentelemetry/api';
import SkywalkingPropagator from './SkywalkingPropagator';
import Tracer from './Tracer';
import { AsyncHooksContextManager, AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import * as semver from 'semver';
import config from '../config/AgentConfig';
import { createLogger } from '../logging';

const logger = createLogger(__filename);

/**
 * This class represents a basic tracer provider which platform libraries can extend
 */
export class NodeTracerProvider implements TracerProvider {
  private readonly _tracers: Map<string, Tracer> = new Map();

  public async start(): Promise<void> {
    trace.setGlobalTracerProvider(this);

    const ContextManager = semver.gte(process.version, '14.8.0')
      ? AsyncLocalStorageContextManager
      : AsyncHooksContextManager;
    const contextManager = new ContextManager();
    contextManager.enable();
    context.setGlobalContextManager(contextManager);

    const propagator = new SkywalkingPropagator(config.serviceName, config.serviceInstance);
    propagation.setGlobalPropagator(propagator);
  }

  getTracer(name: string, version?: string): Tracer {
    const key = `${name}@${version || ''}`;
    logger.debug('getTracer', { key });
    if (!this._tracers.has(key)) {
      this._tracers.set(key, new Tracer({ name, version }, {}));
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._tracers.get(key)!;
  }
}

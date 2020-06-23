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

import * as fs from 'fs';
import * as path from 'path';
import SwPlugin from '../core/SwPlugin';
import { createLogger } from '../logging';

const logger = createLogger(__filename);

class PluginInstaller {
  pluginDir: string;

  constructor() {
    this.pluginDir = path.resolve(__dirname, '..', 'plugins');
  }

  install(): void {
    fs.readdirSync(this.pluginDir)
      .filter((file) => !file.endsWith('.d.ts'))
      .forEach((file) => {
        const plugin = require(path.join(this.pluginDir, file)).default as SwPlugin;
        logger.info(`Installing plugin ${plugin.module} ${plugin.versions}`);
        plugin.install();
      });
  }
}

export default new PluginInstaller();
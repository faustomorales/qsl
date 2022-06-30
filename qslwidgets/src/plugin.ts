// Copyright (c) Fausto Morales
// Distributed under the terms of the MIT License.

import type { Application, IPlugin } from "@phosphor/application";
import type { Widget } from "@phosphor/widgets";
import { IJupyterWidgetRegistry } from "@jupyter-widgets/base";
import { MODULE_NAME, MODULE_VERSION } from "./version";
import { MediaLabelerModel, MediaLabelerView } from "./widgets/Jupyter";

const EXTENSION_ID = "qsl:plugin";

/**
 * The example plugin.
 */
const qslPlugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  activate: activateWidgetExtension,
  autoStart: true,
} as unknown as IPlugin<Application<Widget>, void>;

export default qslPlugin;

/**
 * Activate the widget extension.
 */
function activateWidgetExtension(
  app: Application<Widget>,
  registry: IJupyterWidgetRegistry
): void {
  registry.registerWidget({
    name: MODULE_NAME,
    version: MODULE_VERSION,
    exports: { MediaLabelerModel, MediaLabelerView },
  });
}

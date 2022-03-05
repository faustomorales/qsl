// Copyright (c) Fausto Morales
// Distributed under the terms of the MIT License.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires
const data = require('../package.json');
export const MODULE_VERSION = data.version;
export const MODULE_NAME = data.name;

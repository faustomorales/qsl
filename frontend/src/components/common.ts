import * as sharedTypes from "./sharedTypes";

import * as react from "react";

const apiUrl = process.env.REACT_APP_API_URL || "";

export const buildEmptyLabelGroup = (
  configGroup: sharedTypes.LabelConfigurationGroup
): sharedTypes.LabelGroup => {
  return {
    text: Object.entries(configGroup.text).reduce(
      (memo, [configName, config]) => {
        return { ...memo, [configName]: null };
      },
      {}
    ),
    multiple: Object.entries(configGroup.multiple).reduce(
      (memo, [configName, config]) => {
        return { ...memo, [configName]: [] };
      },
      {}
    ),
    single: Object.entries(configGroup.single).reduce(
      (memo, [configName, config]) => {
        return { ...memo, [configName]: null };
      },
      {}
    ),
  };
};

export const buildEmptyLabels = (
  project: sharedTypes.Project
): sharedTypes.ImageLabels => {
  return {
    image: buildEmptyLabelGroup(project.labelingConfiguration.image),
    boxes: [],
    default: false,
    ignored: false,
  };
};

export const hasBoxLabels = (
  config: sharedTypes.LabelingConfiguration
): boolean => {
  return (
    Object.keys(config.box.single).length > 0 ||
    Object.keys(config.box.multiple).length > 0 ||
    Object.keys(config.box.text).length > 0
  );
};

export const configurationIsNotEmpty = (
  config: sharedTypes.LabelingConfiguration
): boolean => {
  return (
    Object.keys(config.box.single).length > 0 ||
    Object.keys(config.box.multiple).length > 0 ||
    Object.keys(config.box.text).length > 0 ||
    Object.keys(config.image.single).length > 0 ||
    Object.keys(config.image.multiple).length > 0 ||
    Object.keys(config.image.text).length > 0
  );
};

const getRequestInit = { credentials: "include" as RequestCredentials };
const postRequestInit = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include" as RequestCredentials,
};

export const getProject = (projectId: number | string) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}`,
    getRequestInit
  ).then((r) => r.json());
};

export const getImageLabels = (
  projectId: number | string,
  imageId: number | string
) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`,
    getRequestInit
  ).then((r) => r.json());
};

export const getImages = (
  projectId: number | string,
  excludedIds: number[] = [],
  limit: number = 1,
  shuffle: boolean = true,
  excludeIgnored: boolean = true,
  maxLabels: number = 0,
  page: number = null
) => {
  const exclusionString = excludedIds.map((id) => `exclude=${id}`).join("&");
  let url = `${apiUrl}/api/v1/projects/${projectId}/images?shuffle=${shuffle}&limit=${limit}&exclude_ignored=${excludeIgnored}&max_labels=${maxLabels}&${exclusionString}`;
  if (page) {
    url += `&page=${page}`;
  }
  return fetch(url, getRequestInit).then((r) => r.json());
};

export const setLabels = (
  projectId: number | string,
  imageId: number | string,
  labels: sharedTypes.ImageLabels
) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`,
    {
      ...postRequestInit,
      body: JSON.stringify(labels),
    }
  ).then((r) => r.json());
};

export const deleteLabels = (
  projectId: number | string,
  imageId: number | string
) =>
  fetch(`${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`, {
    ...getRequestInit,
    method: "DELETE",
  }).then((r) => r.json());

export const getImageUrl = (
  projectId: number | string,
  imageId: number | string
) => `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/file`;

export const getExportUrl = (projectId: number | string) =>
  `${apiUrl}/api/v1/projects/${projectId}/export`;

export const delay = (amount: number) =>
  new Promise((resolve) => setTimeout(resolve, amount));

export const simulateClick = async (
  target: react.MutableRefObject<HTMLButtonElement>
) => {
  target.current?.focus({ preventScroll: true });
  await delay(200);
  target.current?.blur();
  target.current?.click();
};

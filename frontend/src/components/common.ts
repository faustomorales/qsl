import * as sharedTypes from "./sharedTypes";

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

export const getProject = (apiUrl: string, projectId: number | string) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}`,
    getRequestInit
  ).then((r) => r.json());
};

export const getImageLabels = (
  apiUrl: string,
  projectId: number | string,
  imageId: number | string
) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`,
    getRequestInit
  ).then((r) => r.json());
};

export const getImages = (
  apiUrl: string,
  projectId: number | string,
  excludedIds: number[],
  limit: number
) => {
  const exclusionString = excludedIds.map((id) => `exclude=${id}`).join("&");
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}/images?shuffle=1&limit=${limit}&exclude_ignored=1&max_labels=0&${exclusionString}`,
    getRequestInit
  ).then((r) => r.json());
};

export const setLabels = (
  apiUrl: string,
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

export const delay = (amount: number) =>
  new Promise((resolve) => setTimeout(resolve, amount));

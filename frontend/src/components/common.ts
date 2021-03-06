import * as sharedTypes from "./sharedTypes";

import * as react from "react";

export const apiUrl = process.env.REACT_APP_BACKEND_PORT
  ? `http://${window.location.hostname}:${process.env.REACT_APP_BACKEND_PORT}`
  : "";

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

export const createUser = (user: sharedTypes.User) =>
  fetch(`${apiUrl}/api/v1/users`, {
    ...postRequestInit,
    body: JSON.stringify(user),
  }).then((r) => r.json() as Promise<sharedTypes.User>);

export const getAuthConfig = () => {
  return fetch(`${apiUrl}/api/v1/auth/config`, getRequestInit).then(
    (r) => r.json() as Promise<sharedTypes.AuthConfig>
  );
};

export const getUsers = () => {
  return fetch(`${apiUrl}/api/v1/users`, getRequestInit).then(
    (r) => r.json() as Promise<sharedTypes.User[]>
  );
};

export const getMyUser = () => {
  return fetch(`${apiUrl}/api/v1/users/me`, getRequestInit)
    .then((r) => {
      if (r.ok) {
        return r;
      }
      throw Error(r.statusText);
    })
    .then((r) => r.json() as Promise<sharedTypes.User>);
};

export const getProject = (projectId: number | string) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}`,
    getRequestInit
  ).then((r) => r.json());
};

export const getProjects = () => {
  return fetch(`${apiUrl}/api/v1/projects`, getRequestInit).then((r) =>
    r.json()
  );
};

export const setProject = (
  projectId: number | string,
  project: sharedTypes.Project
) =>
  fetch(`${apiUrl}/api/v1/projects/${projectId}`, {
    ...postRequestInit,
    body: JSON.stringify(project),
  }).then((r) => r.json());

export const createProject = (project: sharedTypes.Project) =>
  fetch(`${apiUrl}/api/v1/projects`, {
    ...postRequestInit,
    body: JSON.stringify(project),
  }).then((r) => r.json());

export const deleteProject = (projectId: number | string) =>
  fetch(`${apiUrl}/api/v1/projects/${projectId}`, {
    ...getRequestInit,
    method: "DELETE",
  }).then((r) => r.json());

export const getImageLabels = (
  projectId: number | string,
  imageId: number | string
) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}/labels`,
    getRequestInit
  ).then((r) => r.json());
};

export const getImage = (
  projectId: number | string,
  imageId: number | string
) => {
  return fetch(
    `${apiUrl}/api/v1/projects/${projectId}/images/${imageId}`,
    getRequestInit
  ).then((r) => r.json());
};

export const getImages = (
  projectId: number | string,
  excludedIds: string[] = [],
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

export const addImages = (
  projectId: number | string,
  files: string[],
  defaults: sharedTypes.ImageLabels
) =>
  fetch(`${apiUrl}/api/v1/projects/${projectId}/images`, {
    ...postRequestInit,
    body: JSON.stringify({ files, defaults }),
  }).then((r) => r.json());

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

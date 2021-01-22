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

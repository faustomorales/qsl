/* Shared types between frontend and backend. See qsl/types/web.py */

export interface LabelGroup {
  single: { [key: string]: string };
  multiple: { [key: string]: string[] };
  text: { [key: string]: string };
}

export interface Box {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  labels: LabelGroup;
}

export interface ImageLabels {
  image: LabelGroup;
  boxes: Box[];
  default: boolean;
  ignored: boolean;
}

export interface LabelOption {
  id: number;
  shortcut: string;
}

export interface SelectLabelConfiguration {
  id: string;
  options: { [key: string]: LabelOption };
}

export interface TextLabelConfiguration {
  id: string;
  name: string;
}

export interface LabelConfigurationGroup {
  single: { [key: string]: SelectLabelConfiguration };
  multiple: { [key: string]: SelectLabelConfiguration };
  text: { [key: string]: TextLabelConfiguration };
}

export interface LabelingConfiguration {
  image: LabelConfigurationGroup;
  box: LabelConfigurationGroup;
}

export interface Project {
  id: number;
  name: string;
  nImages?: number;
  nLabeled?: number;
  labelingConfiguration: LabelingConfiguration;
}

export interface User {
  id: number;
  name: string;
  isAdmin: boolean;
}

export interface Image {
  id: number;
  filepath?: string;
  labels?: number;
  status?: "ignored" | "labeled" | "unlabeled";
}

export interface ImageGroup {
  files: string[];
  defaults: ImageLabels;
}

export interface InitializationConfiguration {
  imageGroups: ImageGroup[];
  project: Project;
}

export interface AuthConfig {
  provider: "github" | null;
}

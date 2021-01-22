import React from "react";
import * as sharedTypes from "./sharedTypes";

export const Context = React.createContext<{
  apiUrl: string;
  postHeaders: any;
  getHeaders: any;
  queueSize: number;
  user: sharedTypes.User;
}>({
  apiUrl: null,
  postHeaders: null,
  getHeaders: null,
  queueSize: null,
  user: null,
});

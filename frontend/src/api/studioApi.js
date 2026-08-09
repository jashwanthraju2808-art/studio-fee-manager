import API from "./axios";

export const getBatches = () =>
  API.get("/batches/");

export const getStudioInfo = () =>
  API.get("/studio/info");

export const getLogoUrl = () =>
  "http://127.0.0.1:8000/studio/logo";

export const uploadLogo = (file) => {
  const form = new FormData();
  form.append("file", file);

  return API.post("/studio/logo", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
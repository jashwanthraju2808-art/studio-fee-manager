import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const getMembers = () => API.get("/members/");

export const searchMembers = (query) =>
  API.get(`/members/search?q=${query}`);
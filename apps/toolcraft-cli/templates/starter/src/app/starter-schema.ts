import { defineToolcraft } from "@repo/toolcraft-runtime";

export const starterSchema = defineToolcraft({
  canvas: {
    enabled: true,
    upload: true,
  },
  panels: {
    controls: {
      sections: [],
      title: "Controls",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    zoom: true,
  },
});

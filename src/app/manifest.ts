import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YesBroker: Rental brokers in Bengaluru",
    short_name: "YesBroker",
    description:
      "A community-maintained directory of rental brokers across Bengaluru. Find brokers by area and reach them directly.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "contacts",
            accept: ["text/vcard", "text/x-vcard", "text/directory", ".vcf"],
          },
        ],
      },
    },
  } as MetadataRoute.Manifest;
}

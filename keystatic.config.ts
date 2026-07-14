import { config, fields, collection, singleton } from "@keystatic/core";

const repository = process.env.KEYSTATIC_GITHUB_REPO || "video-text/youyoumi-site";
const localDevelopment = process.env.NODE_ENV !== "production";

export default config({
  storage: localDevelopment
    ? { kind: "local" }
    : { kind: "github", repo: repository },
  ui: {
    brand: { name: "Vielumi Global" },
    navigation: {
      Website: ["site", "services"],
    },
  },
  singletons: {
    site: singleton({
      label: "Website content",
      path: "src/content/site",
      format: { data: "json" },
      schema: {
        brandName: fields.text({ label: "Brand name", validation: { isRequired: true } }),
        seoTitle: fields.text({ label: "SEO title", validation: { isRequired: true } }),
        seoDescription: fields.text({ label: "SEO description", multiline: true, validation: { isRequired: true } }),
        heroEyebrow: fields.text({ label: "Hero eyebrow", validation: { isRequired: true } }),
        heroTitle: fields.text({ label: "Hero title", validation: { isRequired: true } }),
        heroAccent: fields.text({ label: "Hero accent", validation: { isRequired: true } }),
        heroLead: fields.text({ label: "Hero description", multiline: true, validation: { isRequired: true } }),
        aboutTitle: fields.text({ label: "About title", validation: { isRequired: true } }),
        aboutIntro: fields.text({ label: "About introduction", multiline: true, validation: { isRequired: true } }),
        mission: fields.text({ label: "Mission", multiline: true, validation: { isRequired: true } }),
        howWeWork: fields.text({ label: "How we work", multiline: true, validation: { isRequired: true } }),
        whoWeSupport: fields.text({ label: "Who we support", multiline: true, validation: { isRequired: true } }),
        contactTitle: fields.text({ label: "Contact heading", validation: { isRequired: true } }),
        contactLead: fields.text({ label: "Contact introduction", multiline: true, validation: { isRequired: true } }),
        contactEmail: fields.text({ label: "General email", validation: { isRequired: true } }),
        apiEmail: fields.text({ label: "Business/API email", validation: { isRequired: true } }),
        location: fields.text({ label: "Location", validation: { isRequired: true } }),
      },
    }),
  },
  collections: {
    services: collection({
      label: "Services",
      slugField: "title",
      path: "src/content/services/*",
      format: { data: "json" },
      schema: {
        title: fields.slug({ name: { label: "Service name", validation: { isRequired: true } } }),
        description: fields.text({ label: "Description", multiline: true, validation: { isRequired: true } }),
        order: fields.integer({ label: "Display order", defaultValue: 1, validation: { min: 1, max: 99 } }),
      },
    }),
  },
});

import { config, fields, collection, singleton } from "@keystatic/core";

export default config({
  storage: {
    kind: "local",
  },
  singletons: {
    site: {
      label: "Site Settings",
      path: "content/site",
      schema: {
        brandName: fields.text({ label: "Brand Name", defaultValue: "Vielumi Global" }),
        contactEmail: fields.text({
          label: "Contact Email",
          defaultValue: "contact@youyoumi.asia",
        }),
        apiEmail: fields.text({
          label: "API Email",
          defaultValue: "api@youyoumi.asia",
        }),
        location: fields.text({ label: "Location", defaultValue: "China" }),
        websiteUrl: fields.text({
          label: "Website URL",
          defaultValue: "https://youyoumi.asia",
        }),
      },
    },
    homepage: {
      label: "Homepage",
      path: "content/homepage",
      schema: {
        eyebrow: fields.text({
          label: "Hero Eyebrow",
          defaultValue: "Cross-border commerce technology",
        }),
        heroTitle: fields.text({
          label: "Hero Title",
          defaultValue: "Turn market signals into e-commerce growth.",
        }),
        heroLead: fields.text({
          label: "Hero Lead",
          multiline: true,
          defaultValue:
            "Vielumi Global helps e-commerce teams improve TikTok Shop operations, AI video production, advertising analysis, product research, and workflow automation.",
        }),
        aboutTitle: fields.text({
          label: "About Title",
          defaultValue: "Built for modern commerce teams.",
        }),
        aboutIntro: fields.text({
          label: "About Intro",
          multiline: true,
          defaultValue:
            "Vielumi Global is a cross-border e-commerce operation and marketing technology company. We combine hands-on commerce experience with practical technology to make complex work clearer, faster, and more measurable.",
        }),
        servicesTitle: fields.text({
          label: "Services Title",
          defaultValue: "Services designed around real operating needs.",
        }),
        servicesIntro: fields.text({
          label: "Services Intro",
          multiline: true,
          defaultValue:
            "Focused support across the workflows that drive cross-border e-commerce performance.",
        }),
        contactTitle: fields.text({
          label: "Contact Title",
          defaultValue: "Let's build a clearer path to growth.",
        }),
        contactIntro: fields.text({
          label: "Contact Intro",
          multiline: true,
          defaultValue:
            "Tell us about your market, operating challenge, or technology requirement. We will respond through the appropriate business channel.",
        }),
      },
    },
  },
  collections: {
    services: {
      label: "Services",
      slugField: "title",
      path: "content/services/*",
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        description: fields.text({ label: "Description", multiline: true }),
        order: fields.integer({ label: "Order", defaultValue: 1 }),
        image: fields.image({
          label: "Image",
          directory: "public/images/services",
          publicPath: "/images/services/",
        }),
      },
    },
  },
});

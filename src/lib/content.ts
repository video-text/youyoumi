import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export const reader = createReader(process.cwd(), keystaticConfig);

export async function getSiteContent() {
  const [site, homepage, services] = await Promise.all([
    reader.singletons.site.read(),
    reader.singletons.homepage.read(),
    reader.collections.services.all(),
  ]);

  const serviceItems = services
    .map((entry) => {
      const rawTitle = entry.entry.title as unknown;
      const title =
        typeof rawTitle === "string"
          ? rawTitle
          : rawTitle && typeof rawTitle === "object" && "name" in rawTitle
            ? String((rawTitle as { name: string }).name)
            : entry.slug;

      return {
        slug: entry.slug,
        title,
        description: entry.entry.description,
        order: entry.entry.order ?? 99,
      };
    })
    .sort((a, b) => a.order - b.order);

  return {
    site: site ?? {
      brandName: "Vielumi Global",
      contactEmail: "contact@youyoumi.asia",
      apiEmail: "api@youyoumi.asia",
      location: "China",
      websiteUrl: "https://youyoumi.asia",
    },
    homepage: homepage ?? {
      eyebrow: "Cross-border commerce technology",
      heroTitle: "Turn market signals into e-commerce growth.",
      heroLead:
        "Vielumi Global helps e-commerce teams improve TikTok Shop operations, AI video production, advertising analysis, product research, and workflow automation.",
      aboutTitle: "Built for modern commerce teams.",
      aboutIntro:
        "Vielumi Global is a cross-border e-commerce operation and marketing technology company. We combine hands-on commerce experience with practical technology to make complex work clearer, faster, and more measurable.",
      servicesTitle: "Services designed around real operating needs.",
      servicesIntro:
        "Focused support across the workflows that drive cross-border e-commerce performance.",
      contactTitle: "Let's build a clearer path to growth.",
      contactIntro:
        "Tell us about your market, operating challenge, or technology requirement. We will respond through the appropriate business channel.",
    },
    services: serviceItems.length
      ? serviceItems
      : [
          {
            slug: "ecommerce-operation",
            title: "Cross-border E-commerce Operation",
            description:
              "Operational planning and workflow support for teams selling across international markets.",
            order: 1,
          },
          {
            slug: "tiktok-shop",
            title: "TikTok Shop Operation Support",
            description:
              "Practical support for shop workflows, content coordination, performance reviews, and execution.",
            order: 2,
          },
          {
            slug: "ai-video",
            title: "AI Video Content Production",
            description:
              "AI-assisted systems for developing, producing, and organizing scalable short-form content.",
            order: 3,
          },
          {
            slug: "marketing-analytics",
            title: "Marketing Data Analytics",
            description:
              "Structured performance analysis that turns campaign and commerce data into clear actions.",
            order: 4,
          },
          {
            slug: "product-research",
            title: "Product Research and Testing",
            description:
              "Market research and testing frameworks for evaluating product demand and commercial potential.",
            order: 5,
          },
          {
            slug: "automation-tools",
            title: "E-commerce Automation Tools",
            description:
              "Lightweight automation solutions that reduce repetitive work and improve operating consistency.",
            order: 6,
          },
        ],
  };
}

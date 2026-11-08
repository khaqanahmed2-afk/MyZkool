import { useEffect } from "react";

export interface PageMetadataOptions {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_TITLE = "MyZkool | School Website Builder & Management ERP with WhatsApp";
const DEFAULT_DESCRIPTION =
  "One unified platform for school websites, fee collections, attendance, report cards, and automated WhatsApp parent notifications. Zero IT team required.";
const DEFAULT_OG_IMAGE = "https://myzkool.in/logo.svg";

function setMetaTag(selector: string, attribute: string, value: string, createIfMissing: { tag: string; attrName: string; attrVal: string }) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement(createIfMissing.tag);
    element.setAttribute(createIfMissing.attrName, createIfMissing.attrVal);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

export function usePageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  twitterCard = "summary_large_image",
  noindex = false,
  structuredData,
}: PageMetadataOptions) {
  useEffect(() => {
    // 1. Format and set page title
    const fullTitle = title.includes("MyZkool") ? title : `${title} | MyZkool`;
    const previousTitle = document.title;
    document.title = fullTitle;

    // 2. Set meta description
    setMetaTag('meta[name="description"]', "content", description, {
      tag: "meta",
      attrName: "name",
      attrVal: "description",
    });

    // 3. Set OpenGraph tags
    setMetaTag('meta[property="og:title"]', "content", fullTitle, {
      tag: "meta",
      attrName: "property",
      attrVal: "og:title",
    });
    setMetaTag('meta[property="og:description"]', "content", description, {
      tag: "meta",
      attrName: "property",
      attrVal: "og:description",
    });
    setMetaTag('meta[property="og:image"]', "content", ogImage, {
      tag: "meta",
      attrName: "property",
      attrVal: "og:image",
    });

    // 4. Set Twitter tags
    setMetaTag('meta[name="twitter:card"]', "content", twitterCard, {
      tag: "meta",
      attrName: "name",
      attrVal: "twitter:card",
    });
    setMetaTag('meta[name="twitter:title"]', "content", fullTitle, {
      tag: "meta",
      attrName: "name",
      attrVal: "twitter:title",
    });
    setMetaTag('meta[name="twitter:description"]', "content", description, {
      tag: "meta",
      attrName: "name",
      attrVal: "twitter:description",
    });
    setMetaTag('meta[name="twitter:image"]', "content", ogImage, {
      tag: "meta",
      attrName: "name",
      attrVal: "twitter:image",
    });

    // 5. Canonical URL
    if (canonical) {
      setMetaTag('link[rel="canonical"]', "href", canonical, {
        tag: "link",
        attrName: "rel",
        attrVal: "canonical",
      });
    }

    // 6. Robots indexing
    const robotsContent = noindex ? "noindex, nofollow" : "index, follow";
    setMetaTag('meta[name="robots"]', "content", robotsContent, {
      tag: "meta",
      attrName: "name",
      attrVal: "robots",
    });

    // 7. Inject JSON-LD structured data if provided
    let scriptEl = document.getElementById("jsonld-structured-data") as HTMLScriptElement | null;
    if (structuredData) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = "jsonld-structured-data";
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(structuredData);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      const cleanScript = document.getElementById("jsonld-structured-data");
      if (cleanScript) {
        cleanScript.remove();
      }
    };
  }, [title, description, canonical, ogImage, twitterCard, noindex, structuredData]);
}

export default usePageMetadata;

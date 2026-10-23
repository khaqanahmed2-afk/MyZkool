import { useEffect } from "react";

export interface PageMetadataOptions {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

const DEFAULT_TITLE = "MyZkool — School Website Builder & Management ERP with WhatsApp";
const DEFAULT_DESCRIPTION =
  "One platform for your school's website, fees, attendance, report cards, and WhatsApp notifications. Designed for K12 schools across Tier 2 and Tier 3 India with no IT team required.";

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
  noindex = false,
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

    // 4. Set Twitter tags
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

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
    };
  }, [title, description, canonical, noindex]);
}

export default usePageMetadata;

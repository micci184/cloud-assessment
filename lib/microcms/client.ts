import type { HandsOnCourse, MicroCmsListResponse } from "./types";

const HANDSON_ENDPOINT = "handson-courses";
const REVALIDATE_SECONDS = 60 * 60;

const getRequiredEnv = (name: "MICROCMS_API_KEY" | "MICROCMS_SERVICE_DOMAIN"): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

const getBaseUrl = (): string => {
  const serviceDomain = getRequiredEnv("MICROCMS_SERVICE_DOMAIN");
  return `https://${serviceDomain}.microcms.io/api/v1`;
};

const getHeaders = (): HeadersInit => {
  const apiKey = getRequiredEnv("MICROCMS_API_KEY");
  return {
    "X-MICROCMS-API-KEY": apiKey,
    "Content-Type": "application/json",
  };
};

const fetchMicroCms = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: getHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`microCMS request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const getHandsOnCourses = async (): Promise<HandsOnCourse[]> => {
  const data = await fetchMicroCms<MicroCmsListResponse<HandsOnCourse>>(
    `/${HANDSON_ENDPOINT}?fields=id,title,slug,description,platform,difficulty,estimatedMinutes,thumbnail,steps`,
  );
  return data.contents;
};

export const getHandsOnCourseBySlug = async (
  slug: string,
): Promise<HandsOnCourse | null> => {
  const encodedSlug = encodeURIComponent(slug);
  const data = await fetchMicroCms<MicroCmsListResponse<HandsOnCourse>>(
    `/${HANDSON_ENDPOINT}?filters=slug[equals]${encodedSlug}&limit=1&fields=id,title,slug,description,platform,difficulty,estimatedMinutes,thumbnail,steps`,
  );
  return data.contents[0] ?? null;
};

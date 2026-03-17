export type MicroCmsImage = {
  url: string;
  width: number;
  height: number;
};

export type HandsOnStep = {
  title: string;
  content: string;
  goalDescription: string;
};

export type HandsOnCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  platform: string;
  difficulty: number;
  estimatedMinutes: number;
  thumbnail?: MicroCmsImage;
  steps: HandsOnStep[];
};

export type MicroCmsListResponse<T> = {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
};

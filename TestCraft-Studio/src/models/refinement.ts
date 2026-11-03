import type { WorkItem, TestCase } from "./types";
export type RefinementStatus = "Por refinar" | "Refinada";
export type RefinementQuestion = { text: string; answer: string; notApplicable?: boolean; includeInStory?: boolean; affectsStory?: boolean };
export type RefinementEntry = {
  story: WorkItem;
  cases: TestCase[];
  publishedCases?: PublishedCaseReference[];
  questions: RefinementQuestion[];
  status: RefinementStatus;
  updatedAt: string;
  workflowMode?: "questions" | "testCases";
  questionsCompleted?: boolean;
  testsOutdated?: boolean;
  storyRefreshSignature?: string;
};
export type PublishedEntry = {
  storyId: number;
  storyTitle: string;
  testCaseIds: number[];
  publishedAt: string;
};

export type PublishedCaseReference = {localId:string;title:string;azureDevOpsId?:number|undefined;publishedPlanId?:number|undefined;publishedSuiteId?:number|undefined};

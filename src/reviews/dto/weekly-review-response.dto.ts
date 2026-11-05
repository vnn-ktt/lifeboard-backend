/** Exactly the shape of the frontend's WeeklyReview interface. */
export interface WeeklyReviewResponseDto {
  weekStart: string;
  wins: string;
  obstacles: string;
  nextStep: string;
  mood: number;
  updatedAt: string;
}

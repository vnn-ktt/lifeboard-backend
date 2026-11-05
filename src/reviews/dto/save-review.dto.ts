import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

/** Full replacement of a reflection, matching frontend's saveReview payload. */
export class SaveReviewDto {
  @IsString()
  @MaxLength(1000)
  wins!: string;

  @IsString()
  @MaxLength(1000)
  obstacles!: string;

  @IsString()
  @MaxLength(1000)
  nextStep!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  mood!: number;
}

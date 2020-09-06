import { ArrayNotEmpty, IsDefined, IsNotEmpty, IsPositive } from 'class-validator';
import {
  CreateBonusRequest as ICreateBonusRequest, CreateMilestoneRequest as ICreateMilestoneRequest,
} from '../../types';

export class CreateMilestoneRequest implements ICreateMilestoneRequest {
  @IsDefined()
  @IsNotEmpty()
  name: string;

  @IsDefined()
  @IsPositive()
  points: number;
}

export class CreateBonusRequest implements ICreateBonusRequest {
  @IsDefined()
  @IsNotEmpty()
  description: string;

  @IsDefined()
  @ArrayNotEmpty()
  users: string[];

  @IsDefined()
  @IsPositive()
  points: number;
}

import { Allow, ArrayNotEmpty, IsDefined, IsIn, IsNotEmpty, IsPositive, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateBonusRequest as ICreateBonusRequest,
  CreateMilestoneRequest as ICreateMilestoneRequest,
  SubmitAttendanceForUsersRequest as ISubmitAttendanceForUsersRequest,
  ModifyUserAccessLevelRequest as IModifyUserAccessLevelRequest,
  Milestone as IMilestone,
  Bonus as IBonus,
  UserAccessUpdates as IUserAccessUpdates,
  UserAccessType,
} from '../../types';

const validUserAccessTypes = Object.values(UserAccessType);

export class Milestone implements IMilestone {
  @IsDefined()
  @IsNotEmpty()
  name: string;

  @IsDefined()
  @IsPositive()
  points: number;
}

export class Bonus implements IBonus {
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

export class CreateMilestoneRequest implements ICreateMilestoneRequest {
  @Type(() => Milestone)
  @ValidateNested()
  @IsDefined()
  milestone: Milestone;
}

export class CreateBonusRequest implements ICreateBonusRequest {
  @Type(() => Bonus)
  @ValidateNested()
  @IsDefined()
  bonus: Bonus;
}

export class SubmitAttendanceForUsersRequest implements ISubmitAttendanceForUsersRequest {
  @IsDefined()
  @ArrayNotEmpty()
  users: string[];

  @IsDefined()
  @IsUUID()
  event: string;

  @Allow()
  asStaff?: boolean;
}

export class UserAccessUpdates implements IUserAccessUpdates {
  @IsDefined()
  user: string;

  @IsDefined()
  @IsIn(validUserAccessTypes)
  accessType: string;
}
export class ModifyUserAccessLevelRequest implements IModifyUserAccessLevelRequest {
  @Type(() => UserAccessUpdates)
  @IsDefined()
  @ValidateNested()
  accessUpdates: UserAccessUpdates[];
}

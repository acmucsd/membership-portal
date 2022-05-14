import { Uuid } from '@acmucsd/membership-portal-types';
import { UserModel } from '../database/models/UserModel';

export interface AuthActionMetadata {
  trace_id: string;
  user_uuid: Uuid;
}

export function authActionMetadata(trace_id: string, user: UserModel): AuthActionMetadata {
  return {
    trace_id,
    user_uuid: user.uuid,
  };
}

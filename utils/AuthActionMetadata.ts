import { Uuid } from '../types';
import { UserModel } from '../models/UserModel';

export interface AuthActionMetadata {
  request_id: string;
  user_uuid: Uuid;
}

export function authActionMetadata(request_id: string, user: UserModel): AuthActionMetadata {
  return {
    request_id,
    user_uuid: user.uuid,
  };
}

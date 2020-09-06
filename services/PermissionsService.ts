import { Service } from 'typedi';
import { UserModel } from '@Models/UserModel';
import { UserState, PublicOrder } from 'types';

@Service()
export default class PermissionsService {
  public static canEditEvents(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canSeeEventAttendances(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canCreateMilestones(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canGrantPointBonuses(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canEditMerchStore(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canAccessMerchStore(user: UserModel): boolean {
    return user.state === UserState.ACTIVE;
  }

  public static canSeeMerchOrder(user: UserModel, order: PublicOrder) {
    return user.isAdmin() || (this.canAccessMerchStore(user) && order.user === user.uuid);
  }

  public static canSeeAllMerchOrders(user: UserModel) {
    return user.isAdmin();
  }

  public static canFulfillMerchOrders(user: UserModel) {
    return user.isAdmin();
  }
}

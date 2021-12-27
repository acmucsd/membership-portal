import { Service } from 'typedi';
import { UserModel } from '../models/UserModel';
import { UserState, PublicOrder } from '../types';

@Service()
export default class PermissionsService {
  public static canEditEvents(user: UserModel): boolean {
    return user.isAdmin() || user.isMarketing();
  }

  public static canSeeEventAttendances(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canSubmitFeedback(user: UserModel): boolean {
    return user.state === UserState.ACTIVE;
  }

  public static canRespondToFeedback(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canCreateMilestones(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canGrantPointBonuses(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canSeeAllUserEmails(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canSubmitAttendanceForUsers(user: UserModel): boolean {
    return user.isAdmin();
  }

  public static canEditMerchStore(user: UserModel): boolean {
    return user.isAdmin() || user.isMerchStoreManager();
  }

  public static canAccessMerchStore(user: UserModel): boolean {
    return user.state === UserState.ACTIVE;
  }

  public static canSeeOptionQuantities(user: UserModel): boolean {
    return user.isAdmin() || user.isMerchStoreManager();
  }

  public static canSeeMerchOrder(user: UserModel, order: PublicOrder) {
    return user.hasStoreDistributorPermissions() || (this.canAccessMerchStore(user) && order.user.uuid === user.uuid);
  }

  public static canSeeAllMerchOrders(user: UserModel) {
    return PermissionsService.canDistributeMerch(user);
  }

  public static canManageMerchOrders(user: UserModel) {
    return PermissionsService.canDistributeMerch(user);
  }

  public static canSeePickupEventOrders(user: UserModel) {
    return PermissionsService.canDistributeMerch(user);
  }

  public static canManagePickupEvents(user: UserModel) {
    return PermissionsService.canDistributeMerch(user);
  }

  public static canCancelAllPendingOrders(user: UserModel) {
    return user.isAdmin() || user.isMerchStoreManager();
  }

  private static canDistributeMerch(user: UserModel) {
    return user.isAdmin() || user.isMerchStoreManager() || user.isMerchStoreDistributor();
  }
}

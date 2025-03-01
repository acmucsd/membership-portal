import { AddUsersTable1595474487693 } from "./0001-add-users-table";
import { AddEventsTable1595474505142 } from "./0002-add-events-table";
import { AddAttendancesTable1595474511242 } from "./0003-add-attendances-table";
import { AddActivitiesTable1595474518615 } from "./0004-add-activities-table";
import { AddBonusPoints1595474528982 } from "./0005-add-bonus-points";
import { AddStaffRole1595474540818 } from "./0006-add-staff-role";
import { AddStaffedEvents1595474545484 } from "./0007-add-staffed-events";
import { AddStaffAttendance1595474552159 } from "./0008-add-staff-attendance";
import { AddStaffActivity1595474561776 } from "./0009-add-staff-activity";
import { AddProfileBio1595474568734 } from "./0010-add-profile-bio";
import { AddSpendableCredits1598589020508 } from "./0011-add-spendable-credits";
import { AddMerchActivity1598589697701 } from "./0012-add-merch-activity";
import { AddMerchCollectionsTable1598590154911 } from "./0013-add-merchCollections-table";
import { AddMerchTable1598590965470 } from "./0014-add-merch-table";
import { AddOrdersTable1598590986254 } from "./0015-add-orders-table";
import { AddOrderItemsTable1598590991046 } from "./0016-add-orderItems-table";
import { MergeOldSchema1598743920351 } from "./0017-merge-old-schema";
import { AddItemOptionsTable1600648017504 } from "./0018-add-merch-item-options";
import { AddSlidingLeaderboardIndex1601840868173 } from "./0019-add-sliding-leaderboard-index";
import { ReplaceEnumsWithStrings1602914093929 } from "./0020-replace-enums-with-strings";
import { FixUserEnumDefaults1603649172865 } from "./0021-fix-user-enum-defaults";
import { SubmitEventFeedback1603825909623 } from "./0022-add-eventFeedback";
import { SubmitFeedbackTable1603825929793 } from "./0023-add-feedback-table";
import { ChangePublicActivityType1605316601032 } from "./0024-change-public-activity-type";
import { AddActivityScopeIndex1608574428247 } from "./0025-add-public-activity-scope-index";
import { AddMerchCollectionTheme1621463276136 } from "./0026-add-merch-collection-theme";
import { SpecifyMerchItemVariants1621463589936 } from "./0027-specify-merch-item-variants";
import { AddOrderPickupEventTable1631941497968 } from "./0028-add-orderPickupEvent-table";
import { AddOrderPickupEventField1631941813500 } from "./0029-add-order-pickupEvent-field";
import { AddOrderStatusField1633030219180 } from "./0030-add-order-status-field";
import { AddOrderPickupEventOrderLimitField1633494827092 } from "./0031-add-orderPickupEvent-orderLimit-field";
import { AddCreatedAtColumnToMerchCollection1640851101278 } from "./0032-add-created-at-column-to-merch-collection";
import { AddPickupEventStatusField1642898108471 } from "./0033-add-pickup-event-status-field";
import { AddResumeTable1663900724564 } from "./0034-add-resume-table";
import { UserSocialMedia1676064415533 } from "./0035-add-userSocialMedia-table";
import { AddHandleColumnToUsersTable1680150373509 } from "./0036-add-handle-column-to-users-table";
import { AddUserAttendancePermissionToUserTable1691286073346 } from "./0037-add-userAttendancePermission-to-userTable";
import { AddMerchItemImageTable1691286073347 } from "./0038-add-merch-item-image-table";
import { AddCollectionImageTable1696990832868 } from "./0039-add-collection-image-table";
import {
  AddLinkedEventColumnToOrderPickupEventTable1704352457840
} from "./0040-add-linkedEvent-column-to-orderPickupEvent-table";
import { AddExpressCheckinsTable1708807643314 } from "./0041-add-expressCheckins-table";
import { RemoveUsersLastLoginColumn1711518997063 } from "./0042-remove-users-lastLogin-column";
import { AddFeedbackEventColum1711860173561 } from "./0043-add-feedback-event-colum";
import {
  AddDiscordAndGoogleCalendarEventColumns1712185658430
} from "./0044-add-discord-and-google-calendar-event-columns";
import { FixDiscordGcalField1714770061929 } from "./0045-fix-discord-gcal-field";
import { AddFoodItemsColumn1728959627663 } from "./0046-add-food-items-column";
import { AddOnboardingSeen1730353019494 } from "./0047-add-onboarding-seen";

// Organize all migrations into an array
export const migrations = [
  AddUsersTable1595474487693,
  AddEventsTable1595474505142,
  AddAttendancesTable1595474511242,
  AddActivitiesTable1595474518615,
  AddBonusPoints1595474528982,
  AddStaffRole1595474540818,
  AddStaffedEvents1595474545484,
  AddStaffAttendance1595474552159,
  AddStaffActivity1595474561776,
  AddProfileBio1595474568734,
  AddSpendableCredits1598589020508,
  AddMerchActivity1598589697701,
  AddMerchCollectionsTable1598590154911,
  AddMerchTable1598590965470,
  AddOrdersTable1598590986254,
  AddOrderItemsTable1598590991046,
  MergeOldSchema1598743920351,
  AddItemOptionsTable1600648017504,
  AddSlidingLeaderboardIndex1601840868173,
  ReplaceEnumsWithStrings1602914093929,
  FixUserEnumDefaults1603649172865,
  SubmitEventFeedback1603825909623,
  SubmitFeedbackTable1603825929793,
  ChangePublicActivityType1605316601032,
  AddActivityScopeIndex1608574428247,
  AddMerchCollectionTheme1621463276136,
  SpecifyMerchItemVariants1621463589936,
  AddOrderPickupEventTable1631941497968,
  AddOrderPickupEventField1631941813500,
  AddOrderStatusField1633030219180,
  AddOrderPickupEventOrderLimitField1633494827092,
  AddCreatedAtColumnToMerchCollection1640851101278,
  AddPickupEventStatusField1642898108471,
  AddResumeTable1663900724564,
  UserSocialMedia1676064415533,
  AddHandleColumnToUsersTable1680150373509,
  AddUserAttendancePermissionToUserTable1691286073346,
  AddMerchItemImageTable1691286073347,
  AddCollectionImageTable1696990832868,
  AddLinkedEventColumnToOrderPickupEventTable1704352457840,
  AddExpressCheckinsTable1708807643314,
  RemoveUsersLastLoginColumn1711518997063,
  AddFeedbackEventColum1711860173561,
  AddDiscordAndGoogleCalendarEventColumns1712185658430,
  FixDiscordGcalField1714770061929,
  AddFoodItemsColumn1728959627663,
  AddOnboardingSeen1730353019494,
];

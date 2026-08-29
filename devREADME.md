## For People New To Backend

### Navigation
- Routes can be found in the `Controller` files under `api/controllers`


#### Identifying Routes For `Controller` Classes
This section will reference the `AttendaceController.ts` class from May 2024.

```
@JsonController('/attendance')
export class AttendanceController {
  ...
  ...
}
```
The `@JSONController` determins the start of the route for all API routes in the class.

```
@JsonController('/attendance')
export class AttendanceController {
  ...
  ...
  ...

  @UseBefore(UserAuthentication)
  @Post()
  async attendEvent(@Body() body: AttendEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<AttendEventResponse> {
    const { event } = await this.attendanceService.attendEvent(user, body.attendanceCode, body.asStaff);
    return { error: null, event };
  }

  ...
  ...
  ...
```
The `@UseBefore` means that it'll run the `UserAuthentication` middleware before every route. This means we don't have to manually check that people are authenticated inside `attendEvent` (in other words, we can guarentee inside `attendEvent` that people have been authenticated).

The `@Post` means that this route is a post route.



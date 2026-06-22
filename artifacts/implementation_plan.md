# Organization Management Refactor

This plan implements three major user requests: allowing multiple managers per organization, completely removing the "editor" role from the application, and democratizing group editing by granting all organization members the ability to add, delete, and transpose songs within a group.

## User Review Required
> [!WARNING]
> Database schema changes: The `managerId` field on `MongoOrganization` will be migrated (in application logic) to `managerIds` string array. Any existing single `managerId` will be converted to an array element to maintain backwards compatibility during reads.

> [!WARNING]
> Role removals: The global `editor` user role is being permanently removed. Existing editors will fallback to `user` role unless they are managers.

> [!WARNING]
> Security change: Any organization member will now be able to modify the organization's groups (add/delete/transpose songs). This relaxes previous restrictions where only managers or editors could modify groups.

## Proposed Changes

### Database Schema and Types
Modifying core types and ensuring backward compatibility for legacy records.
#### [MODIFY] `src/lib/types.ts`
- Remove `editor` from `UserRole` type
- Change `managerId: string` to `managerIds: string[]` in `Organization` related interfaces (Mongo, Input, Update).

#### [MODIFY] `src/backend/models/organization.ts`
- Update `toOrganization` mapping to convert existing `managerId` legacy field (if present) into the new `managerIds` array.
- Update `create` method to initialize `managerIds: [createdBy]`.
- Update `find` and `list` queries from checking `{ managerId: id }` to checking `{ managerIds: id }`.
- Update `assignManager` to instead add/remove a manager from the `managerIds` array (using `$addToSet` and `$pull`).

---

### Backend API Updates
Updating permission checks and logic on all backend routes.
#### [MODIFY] `src/app/api/organizations/[id]/route.ts`
- Change permission checks to verify user is in `managerIds`.
#### [MODIFY] `src/app/api/organizations/[id]/assign-manager/route.ts`
- Rename logic (or add a new route if needed) to support adding *or* removing a manager instead of replacing the *only* manager.
#### [DELETE] `src/app/api/organizations/[id]/appoint-editor/route.ts`
- Remove this endpoint as the `editor` role no longer exists.
#### [MODIFY] `src/app/api/groups/route.ts` & `src/app/api/groups/[id]/route.ts`
- Change permission checks: previously `isEditor` or `isOrgManager` was checked to allow edits. Now, simply being a member of the organization (`organization.members.includes(auth.userId)`) grants edit permission.
#### [MODIFY] `src/app/api/songs/route.ts` & `src/app/api/songs/[id]/route.ts`
- Remove `editor` role checks. Update manager verification to use `managerIds`.

---

### Frontend Components & Contexts
Updating the UI to correctly display permissions, multiple managers, and remove editor references.
#### [MODIFY] `src/components/OrganizationDetail.tsx`
- Remove the "+ editor" UI controls.
- Update the layout so adding a manager doesn't warn about "losing privileges" (since multiple managers are allowed).
- Allow managers to revoke manager status from other managers.
#### [MODIFY] `src/contexts/OrganizationContext.tsx`
- Replace single manager assignments with `addManagerToOrganization` and `removeManagerFromOrganization`.
#### [MODIFY] `src/components/GroupSongList.tsx`
- Update `canManage` fallback to be `true` for *all* organization members.
#### [MODIFY] `src/views/GroupDetail.tsx`
- Update `canManage` block to allow org members to rename the group and invite members.
#### [MODIFY] `src/views/AdminDashboard.tsx`
- Remove references to `editor` stats. Update mapping logic to consider multiple managers per organization.
#### [MODIFY] `src/views/SongList.tsx` & `src/views/SongDetail.tsx`
- Remove references to `editor` when determining `canEdit` privileges.

## Open Questions
- Do we need a database migration script to immediately convert all `managerId` fields in MongoDB to `managerIds`, or is it sufficient to handle legacy fields gracefully at the Model layer (adding it to `managerIds` during document read and updating it upon next save)?

## Verification Plan
### Automated Tests
- Type checking will ensure no `editor` or `managerId` fields are left unchecked in the codebase.
### Manual Verification
1. Log in as a regular user, ask a manager to invite the user to the org.
2. Ensure the regular member can now enter a Group (Song Set) and successfully add/delete songs and save transpositions.
3. Ensure the current Manager can assign another user as an additional Manager.
4. Verify the new Manager also has management controls (like removing members or editing the org details).

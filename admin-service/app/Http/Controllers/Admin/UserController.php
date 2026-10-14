<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Users\CreateUserAction;
use App\Actions\Users\DeleteUserAction;
use App\Actions\Users\FindUserAction;
use App\Actions\Users\ListUsersAction;
use App\Actions\Users\UpdateUserAction;
use App\Dto\Users\UserPageDto;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Users\ListUsersRequest;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\View\View;

/** User management. The users live in the API gateway — every action goes through it. */
final class UserController extends Controller
{
    public function index(ListUsersRequest $request, ListUsersAction $listUsers): View
    {
        $filter = $request->toDto();

        return view('admin.users.index', [
            'users' => $this->paginate($listUsers->execute($filter), $request),
            'filter' => $filter,
            'roles' => UserRole::cases(),
        ]);
    }

    public function create(): View
    {
        return view('admin.users.create', ['roles' => UserRole::cases()]);
    }

    public function store(StoreUserRequest $request, CreateUserAction $createUser): RedirectResponse
    {
        $user = $createUser->execute($request->toDto());

        return redirect()
            ->route('admin.users.index')
            ->with('status', __('User :email created.', ['email' => $user->email]));
    }

    public function edit(string $user, FindUserAction $findUser): View
    {
        return view('admin.users.edit', [
            'user' => $findUser->execute($user),
            'roles' => UserRole::cases(),
        ]);
    }

    public function update(UpdateUserRequest $request, string $user, UpdateUserAction $updateUser): RedirectResponse
    {
        $updated = $updateUser->execute($user, $request->toDto());

        return redirect()
            ->route('admin.users.index')
            ->with('status', __('User :email updated.', ['email' => $updated->email]));
    }

    public function destroy(string $user, DeleteUserAction $deleteUser): RedirectResponse
    {
        $deleteUser->execute($user);

        return redirect()
            ->route('admin.users.index')
            ->with('status', __('User deleted.'));
    }

    /** Turns the gateway's page into Laravel's paginator, so the view can use {{ $users->links() }}. */
    private function paginate(UserPageDto $page, ListUsersRequest $request): LengthAwarePaginator
    {
        return new LengthAwarePaginator(
            items: $page->users,
            total: $page->total,
            perPage: $page->limit,
            currentPage: $page->page,
            options: ['path' => $request->url(), 'query' => $request->query()],
        );
    }
}

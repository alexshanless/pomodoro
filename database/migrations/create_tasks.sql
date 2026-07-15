-- Tasks: plan work in tasks, track it in pomodoros.
-- Adds the tasks table (owner-only RLS) and links pomodoro_sessions to the
-- task they advanced via a nullable task_id column.
-- Idempotent: safe to re-run.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  estimated_pomodoros integer check (estimated_pomodoros between 1 and 100),
  completed_pomodoros integer not null default 0 check (completed_pomodoros >= 0),
  status text not null default 'open' check (status in ('open', 'done')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on tasks (user_id);
create index if not exists tasks_project_id_idx on tasks (project_id);

alter table tasks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can view their own tasks') then
    create policy "Users can view their own tasks"
      on tasks for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can insert their own tasks') then
    create policy "Users can insert their own tasks"
      on tasks for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can update their own tasks') then
    create policy "Users can update their own tasks"
      on tasks for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'Users can delete their own tasks') then
    create policy "Users can delete their own tasks"
      on tasks for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

-- Keep updated_at fresh on every update.
create or replace function set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row
  execute function set_tasks_updated_at();

-- Link sessions to the task they advanced. Deleting a task keeps the
-- session history but detaches it.
alter table pomodoro_sessions
  add column if not exists task_id uuid references tasks(id) on delete set null;

create index if not exists pomodoro_sessions_task_id_idx on pomodoro_sessions (task_id);

-- ① ワークスペース一覧
create table if not exists pf_workspaces (
  id        text primary key,
  user_id   text not null,
  name      text not null,
  color     text not null,
  sort_order int default 0
);

-- ② ワークスペースのデータ（items / folders / links をまとめてJSONで保存）
create table if not exists pf_ws_data (
  ws_id      text primary key references pf_workspaces(id) on delete cascade,
  user_id    text not null,
  items      jsonb not null default '[]',
  folders    jsonb not null default '[]',
  links      jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- RLS: anon キーでも読み書きできるようにする（個人ツールのため）
alter table pf_workspaces enable row level security;
alter table pf_ws_data    enable row level security;

create policy "allow all for anon" on pf_workspaces for all using (true) with check (true);
create policy "allow all for anon" on pf_ws_data    for all using (true) with check (true);
